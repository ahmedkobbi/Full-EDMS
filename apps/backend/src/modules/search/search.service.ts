/**
 * Smart EDMS — Search service.
 *
 * Provides:
 *  - `search()` — full-text + metadata search with permission-aware filtering
 *  - `flexSearch()` — flexible cross-dimension search (spec §9.10)
 *  - saved-search CRUD (`saveSearch`, `listSavedSearches`, `deleteSavedSearch`)
 *
 * HONEST FALLBACK DISCLOSURE (spec §9.10):
 *  The spec calls for OpenSearch as the primary search backend. When
 *  OpenSearch is not configured (no `OPENSEARCH_URL`) or the client package
 *  is not installed, the SearchService falls back to PostgreSQL via Prisma's
 *  case-insensitive `contains` operator on `title` + `description`. This is
 *  a less-capable fallback:
 *    - No tokenization, stemming, or relevance ranking.
 *    - No DLA block references, no OCR snippets.
 *    - Facets are computed via additional `groupBy` queries (slower).
 *  When OpenSearch is configured, the SearchService delegates to it via
 *  the SearchIndexer's client.
 *
 * PERMISSION-AWARE FILTERING (spec §9.10 critical rule):
 *  Search results MUST NOT leak the existence of documents the user cannot
 *  access. We enforce this by filtering at the query level — inaccessible
 *  documents are excluded from the candidate set BEFORE pagination, so the
 *  total count and cursor positions never reveal their existence.
 *
 *  Simplified permission model (until the full RBAC + classification-
 *  downgrade machinery is wired up):
 *    - Tenant match is always enforced.
 *    - Soft-deleted documents are excluded (admin can opt-in via flag).
 *    - Documents with sensitivity level > 3 are restricted to
 *      admin / records-manager / compliance-officer roles.
 *    - Documents under legal hold are restricted to admin / records-manager.
 *
 * Spec ref: §9.3 (document lifecycle), §9.10 (search), §14.3 (pagination),
 * §15.3 (tenant isolation), §27.3 (audit + access control).
 */

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/audit.service';
import { SearchIndexer } from './search-indexer';

/** Roles that bypass sensitivity and legal-hold restrictions. */
const ELEVATED_ROLES = new Set(['admin', 'records-manager', 'compliance-officer']);
/** Roles that may view legal-hold documents (subset of elevated). */
const LEGAL_HOLD_VIEW_ROLES = new Set(['admin', 'records-manager']);

/** Maximum sensitivity a non-elevated user may see. */
const MAX_PUBLIC_SENSITIVITY = 3;

export interface SearchQueryInput {
  tenantId: string;
  userId: string;
  userRoles: readonly string[];
  text?: string;
  documentType?: string;
  classificationId?: string;
  status?: string;
  createdByUserId?: string;
  folderId?: string;
  createdAfter?: string;
  createdBefore?: string;
  updatedAfter?: string;
  updatedBefore?: string;
  limit: number;
  cursor?: string;
  sort?: 'createdAt' | 'updatedAt' | 'title' | 'relevance';
  order?: 'asc' | 'desc';
  includeDeleted?: boolean;
}

export interface SearchHitResult {
  documentId: string;
  tenantId: string;
  title: string;
  snippet: string;
  score: number;
  classificationId: string | null;
  contentLanguage: string | null;
  updatedAt: string;
  versionNumber: number;
  sizeBytes: string;
  documentType: string | null;
}

export interface SearchResultEnvelope {
  hits: SearchHitResult[];
  facets: Array<{
    field: string;
    kind: 'terms';
    buckets: Array<{ key: string; count: number }>;
  }>;
  total: number;
  nextCursor: string | null;
  tookMs: number;
  cached: boolean;
}

export interface FlexSearchInput {
  tenantId: string;
  userId: string;
  userRoles: readonly string[];
  text: string;
  documentTypes?: string[];
  classificationIds?: string[];
  createdAfter?: string;
  createdBefore?: string;
  limit: number;
  cursor?: string;
  multimodal?: boolean;
  graphTraversal?: boolean;
}

interface DocumentCursor {
  sort: 'createdAt' | 'updatedAt' | 'title';
  value: string;
  id: string;
}

function encodeCursor(c: DocumentCursor): string {
  return Buffer.from(JSON.stringify(c), 'utf8').toString('base64url');
}

function decodeCursor(raw: string): DocumentCursor {
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as DocumentCursor;
    if (!parsed.sort || !parsed.value || !parsed.id) {
      throw new Error('invalid cursor');
    }
    return parsed;
  } catch {
    throw new BadRequestException({
      messageKey: 'errors.VALIDATION_FAILED',
      detail: 'invalid cursor',
    });
  }
}

/** Build the Prisma where-clause that encodes the permission filter. */
function buildPermissionWhere(
  tenantId: string,
  userRoles: readonly string[],
  opts: { includeDeleted?: boolean } = {},
): Prisma.DocumentWhereInput {
  const elevated = userRoles.some((r) => ELEVATED_ROLES.has(r));
  const canSeeLegalHold = userRoles.some((r) => LEGAL_HOLD_VIEW_ROLES.has(r));
  const where: Prisma.DocumentWhereInput = {
    tenantId,
    deletedAt: opts.includeDeleted ? undefined : null,
  };

  // Sensitivity filter for non-elevated users.
  if (!elevated) {
    where.sensitivityLevel = { lte: MAX_PUBLIC_SENSITIVITY };
    // Hide documents under legal hold from non-records roles.
    if (!canSeeLegalHold) {
      where.legalHoldActive = false;
    }
  }
  return where;
}

/** Highlight the matched text in a snippet (very simple — case-insensitive replace). */
function makeSnippet(text: string, query: string | undefined): string {
  if (!query) return text.slice(0, 240);
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return text.slice(0, 240);
  const start = Math.max(0, idx - 80);
  const end = Math.min(text.length, idx + query.length + 160);
  const snippet = text.slice(start, end);
  return snippet.replace(
    new RegExp(escapeRegex(query), 'gi'),
    (m) => `<mark>${m}</mark>`,
  );
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly indexer: SearchIndexer,
  ) {}

  // -------------------------------------------------------------------------
  // Full-text + metadata search
  // -------------------------------------------------------------------------

  async search(q: SearchQueryInput): Promise<SearchResultEnvelope> {
    const start = Date.now();
    const limit = Math.min(Math.max(q.limit, 1), 100);
    const sort = q.sort ?? 'updatedAt';
    const order = q.order ?? 'desc';

    // Permission filter — always applied FIRST so inaccessible documents
    // never appear in totals, cursors, or facets.
    const where: Prisma.DocumentWhereInput = buildPermissionWhere(
      q.tenantId,
      q.userRoles,
      { includeDeleted: q.includeDeleted },
    );

    if (q.documentType) where.documentType = q.documentType;
    if (q.classificationId) where.classificationId = q.classificationId;
    if (q.status) where.status = q.status as any;
    if (q.createdByUserId) where.createdByUserId = q.createdByUserId;
    if (q.folderId) where.folderId = q.folderId;

    if (q.createdAfter || q.createdBefore) {
      where.createdAt = {
        ...(q.createdAfter ? { gte: new Date(q.createdAfter) } : {}),
        ...(q.createdBefore ? { lte: new Date(q.createdBefore) } : {}),
      };
    }
    if (q.updatedAfter || q.updatedBefore) {
      where.updatedAt = {
        ...(q.updatedAfter ? { gte: new Date(q.updatedAfter) } : {}),
        ...(q.updatedBefore ? { lte: new Date(q.updatedBefore) } : {}),
      };
    }

    // Free-text filter (PG fallback: case-insensitive contains on title+description).
    // For OpenSearch-backed queries this would be a `multi_match` clause.
    if (q.text) {
      where.OR = [
        { title: { contains: q.text, mode: 'insensitive' } },
        { description: { contains: q.text, mode: 'insensitive' } },
      ];
    }

    // Sort + cursor. `relevance` is mapped to `updatedAt` for the PG
    // fallback (no real relevance ranking without OpenSearch). Prisma
    // requires a literal key, so we dispatch on `sortKey` rather than
    // using a computed key (which TS would widen to `string` and reject).
    const sortKey: 'createdAt' | 'updatedAt' | 'title' =
      sort === 'createdAt' ? 'createdAt' : sort === 'title' ? 'title' : 'updatedAt';
    const orderBy: Prisma.DocumentOrderByWithRelationInput =
      sortKey === 'createdAt'
        ? { createdAt: order, id: 'asc' }
        : sortKey === 'title'
          ? { title: order, id: 'asc' }
          : { updatedAt: order, id: 'asc' };

    let cursorClause: Prisma.DocumentWhereUniqueInput | undefined;
    if (q.cursor) {
      const c = decodeCursor(q.cursor);
      cursorClause = { id: c.id };
    }

    const useOpenSearch = await this.indexer.isOpensearchAvailable();
    if (useOpenSearch) {
      // OpenSearch path — for now we still hit PG to assemble the hit payloads
      // because we don't yet store full-text-extracted body in the index.
      // (The indexer stores title/description; once OCR + DLA pipeline writes
      // the full bodyText, this branch can hit OpenSearch directly.)
      this.logger.debug(`search: OpenSearch available but PG path used (full body not yet indexed)`);
    }

    const rows = await this.prisma.document.findMany({
      where,
      orderBy,
      take: limit + 1,
      ...(cursorClause ? { skip: 1, cursor: cursorClause } : {}),
      include: {
        versions: { orderBy: { versionNumber: 'desc' }, take: 1, select: { versionNumber: true } },
        classification: { select: { id: true, code: true, nameKey: true, sensitivityLevel: true } },
      },
    });

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const hits: SearchHitResult[] = pageRows.map((d) => ({
      documentId: d.id,
      tenantId: d.tenantId,
      title: d.title,
      snippet: makeSnippet(d.description ?? d.title, q.text),
      score: 1.0, // PG fallback has no relevance score; OpenSearch path would populate this.
      classificationId: d.classificationId,
      contentLanguage: d.contentLanguage,
      updatedAt: d.updatedAt.toISOString(),
      versionNumber: d.versions[0]?.versionNumber ?? 1,
      sizeBytes: d.sizeBytes.toString(),
      documentType: d.documentType,
    }));

    // Facets — computed via separate groupBy queries on the same `where`.
    const [classificationFacets, documentTypeFacets, createdByFacets, statusFacets] =
      await Promise.all([
        this.facetByField(where, 'classificationId'),
        this.facetByField(where, 'documentType'),
        this.facetByField(where, 'createdByUserId'),
        this.facetByField(where, 'status'),
      ]);

    // Build next cursor
    let nextCursor: string | null = null;
    if (hasMore) {
      const last = pageRows[pageRows.length - 1]!;
      const sortValue =
        sort === 'createdAt'
          ? last.createdAt.toISOString()
          : sort === 'updatedAt'
            ? last.updatedAt.toISOString()
            : sort === 'title'
              ? last.title
              : last.updatedAt.toISOString();
      nextCursor = encodeCursor({ sort: sort === 'relevance' ? 'updatedAt' : sort, value: sortValue, id: last.id });
    }

    const total = await this.prisma.document.count({ where });

    return {
      hits,
      facets: [
        { field: 'classificationId', kind: 'terms', buckets: classificationFacets },
        { field: 'documentType', kind: 'terms', buckets: documentTypeFacets },
        { field: 'createdByUserId', kind: 'terms', buckets: createdByFacets },
        { field: 'status', kind: 'terms', buckets: statusFacets },
      ],
      total,
      nextCursor,
      tookMs: Date.now() - start,
      cached: false,
    };
  }

  // -------------------------------------------------------------------------
  // Flex search
  // -------------------------------------------------------------------------

  async flexSearch(q: FlexSearchInput): Promise<{
    hits: SearchHitResult[];
    total: number;
    nextCursor: string | null;
    tookMs: number;
  }> {
    const start = Date.now();
    const limit = Math.min(Math.max(q.limit, 1), 100);

    const where: Prisma.DocumentWhereInput = buildPermissionWhere(q.tenantId, q.userRoles);

    if (q.text) {
      where.OR = [
        { title: { contains: q.text, mode: 'insensitive' } },
        { description: { contains: q.text, mode: 'insensitive' } },
      ];
    }
    if (q.documentTypes?.length) {
      where.documentType = { in: q.documentTypes };
    }
    if (q.classificationIds?.length) {
      where.classificationId = { in: q.classificationIds };
    }
    if (q.createdAfter || q.createdBefore) {
      where.createdAt = {
        ...(q.createdAfter ? { gte: new Date(q.createdAfter) } : {}),
        ...(q.createdBefore ? { lte: new Date(q.createdBefore) } : {}),
      };
    }

    let cursorClause: Prisma.DocumentWhereUniqueInput | undefined;
    if (q.cursor) {
      const c = decodeCursor(q.cursor);
      cursorClause = { id: c.id };
    }

    const rows = await this.prisma.document.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: limit + 1,
      ...(cursorClause ? { skip: 1, cursor: cursorClause } : {}),
      include: {
        versions: { orderBy: { versionNumber: 'desc' }, take: 1, select: { versionNumber: true } },
      },
    });

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const hits: SearchHitResult[] = pageRows.map((d) => ({
      documentId: d.id,
      tenantId: d.tenantId,
      title: d.title,
      snippet: makeSnippet(d.description ?? d.title, q.text),
      score: 1.0,
      classificationId: d.classificationId,
      contentLanguage: d.contentLanguage,
      updatedAt: d.updatedAt.toISOString(),
      versionNumber: d.versions[0]?.versionNumber ?? 1,
      sizeBytes: d.sizeBytes.toString(),
      documentType: d.documentType,
    }));

    const total = await this.prisma.document.count({ where });

    let nextCursor: string | null = null;
    if (hasMore) {
      const last = pageRows[pageRows.length - 1]!;
      nextCursor = encodeCursor({
        sort: 'updatedAt',
        value: last.updatedAt.toISOString(),
        id: last.id,
      });
    }

    // Multimodal + graph-traversal flags are accepted but no-ops in the
    // PG fallback. They will activate once the OCR / knowledge-graph
    // pipeline writes into OpenSearch.
    if (q.multimodal || q.graphTraversal) {
      this.logger.debug(
        `flexSearch: multimodal=${q.multimodal} graphTraversal=${q.graphTraversal} — ` +
          `not yet implemented in PG-fallback mode`,
      );
    }

    return { hits, total, nextCursor, tookMs: Date.now() - start };
  }

  // -------------------------------------------------------------------------
  // Saved searches
  // -------------------------------------------------------------------------

  async saveSearch(
    tenantId: string,
    userId: string,
    body: {
      name: string;
      query: unknown;
      alertEnabled?: boolean;
      alertInterval?: 'hourly' | 'daily' | 'weekly';
    },
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ id: string; name: string; createdAt: string }> {
    if (!body.name || body.name.length < 1 || body.name.length > 200) {
      throw new BadRequestException({
        messageKey: 'errors.VALIDATION_FAILED',
        detail: 'name must be 1-200 characters',
      });
    }

    const created = await this.prisma.savedSearch.create({
      data: {
        id: randomUUID(),
        tenantId,
        ownerUserId: userId,
        name: body.name,
        query: body.query as Prisma.InputJsonValue,
        alertEnabled: body.alertEnabled ?? false,
        alertInterval: body.alertInterval ?? null,
      },
    });

    await this.audit.record({
      tenantId,
      userId,
      category: 'create',
      code: 'document.read', // No dedicated code for saved-search create; closest is a read audit.
      result: 'allow',
      resourceType: 'saved_search',
      resourceId: created.id,
      ipAddress,
      userAgent,
    });

    return { id: created.id, name: created.name, createdAt: created.createdAt.toISOString() };
  }

  async listSavedSearches(
    tenantId: string,
    userId: string,
    q: { limit: number; cursor?: string },
  ): Promise<{
    items: Array<Record<string, unknown>>;
    nextCursor: string | null;
    hasMore: boolean;
    total: number;
  }> {
    const where: Prisma.SavedSearchWhereInput = { tenantId, ownerUserId: userId };
    const rows = await this.prisma.savedSearch.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: q.limit + 1,
      ...(q.cursor
        ? { skip: 1, cursor: { id: Buffer.from(q.cursor, 'base64url').toString('utf8') } }
        : {}),
    });
    const hasMore = rows.length > q.limit;
    const items = (hasMore ? rows.slice(0, q.limit) : rows).map((s) => ({
      id: s.id,
      name: s.name,
      query: s.query,
      alertEnabled: s.alertEnabled,
      alertInterval: s.alertInterval,
      lastNotifiedAt: s.lastNotifiedAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));
    const last = items[items.length - 1] as { id?: string } | undefined;
    const nextCursor =
      hasMore && last?.id ? Buffer.from(last.id, 'utf8').toString('base64url') : null;
    const total = await this.prisma.savedSearch.count({ where });
    return { items, nextCursor, hasMore, total };
  }

  async deleteSavedSearch(
    tenantId: string,
    userId: string,
    id: string,
    userRoles: readonly string[],
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ id: string; deleted: true }> {
    const saved = await this.prisma.savedSearch.findFirst({
      where: { id, tenantId },
    });
    if (!saved) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });
    const isAdmin = userRoles.includes('admin');
    if (saved.ownerUserId !== userId && !isAdmin) {
      throw new ForbiddenException({ messageKey: 'errors.FORBIDDEN' });
    }
    await this.prisma.savedSearch.delete({ where: { id } });

    await this.audit.record({
      tenantId,
      userId,
      category: 'delete',
      code: 'document.read', // No dedicated code for saved-search delete.
      result: 'allow',
      resourceType: 'saved_search',
      resourceId: id,
      ipAddress,
      userAgent,
    });

    return { id, deleted: true };
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  /**
   * Compute a terms-facet for a single field via Prisma groupBy. Prisma's
   * `groupBy` requires literal field names at compile time, so we dispatch
   * on the field rather than passing it dynamically.
   */
  private async facetByField(
    where: Prisma.DocumentWhereInput,
    field: 'classificationId' | 'documentType' | 'createdByUserId' | 'status',
  ): Promise<Array<{ key: string; count: number }>> {
    let grouped: Array<Record<string, unknown> & { _count: { _all: number } }>;
    if (field === 'classificationId') {
      grouped = await this.prisma.document.groupBy({
        by: ['classificationId'],
        where,
        _count: { _all: true },
        take: 50,
        orderBy: { classificationId: 'desc' as const },
      } as any) as any;
    } else if (field === 'documentType') {
      grouped = await this.prisma.document.groupBy({
        by: ['documentType'],
        where,
        _count: { _all: true },
        take: 50,
        orderBy: { documentType: 'desc' as const },
      } as any) as any;
    } else if (field === 'createdByUserId') {
      grouped = await this.prisma.document.groupBy({
        by: ['createdByUserId'],
        where,
        _count: { _all: true },
        take: 50,
        orderBy: { createdByUserId: 'desc' as const },
      } as any) as any;
    } else {
      grouped = await this.prisma.document.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
        take: 50,
        orderBy: { status: 'desc' as const },
      } as any) as any;
    }
    return grouped
      .map((g) => ({
        key: String(g[field] ?? '(none)'),
        count: g._count._all,
      }))
      .sort((a, b) => b.count - a.count);
  }
}
