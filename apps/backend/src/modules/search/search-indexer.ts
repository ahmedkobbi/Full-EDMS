/**
 * Smart EDMS — Search indexer.
 *
 * Async job that indexes (or de-indexes) a Document into the search engine.
 * Called fire-and-forget from `DocumentService.uploadComplete`,
 * `DocumentService.restoreVersion`, `DocumentService.updateDocument`,
 * and `DocumentService.deleteDocument`.
 *
 * Engine selection (honest about the fallback):
 *  - If `OPENSEARCH_URL` is set AND the `@opensearch-project/opensearch`
 *    package is installed, the document is indexed into OpenSearch.
 *  - Otherwise the indexer is a NO-OP. The SearchService falls back to
 *    PostgreSQL full-text search (case-insensitive `contains` on
 *    title/description) and queries the live `documents` table directly —
 *    so no offline index is required.
 *
 * Spec ref: §9.10 (search), §9.3 (document lifecycle), §15.4 (search infra).
 *
 * NOTE: The OpenSearch client is loaded lazily via dynamic `import()` so the
 * backend compiles and runs even when the OpenSearch package is not yet
 * installed. When the team adds `@opensearch-project/opensearch` to
 * `apps/backend/package.json`, indexing will activate automatically once
 * `OPENSEARCH_URL` is configured.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis.service';
import { DOCUMENT_WS_EVENTS, wsEventChannel } from '../document/document.gateway-events';

/** OpenSearch index name per tenant. */
const indexName = (tenantId: string): string => `smart-edms-documents-${tenantId.toLowerCase()}`;

/** Shape of a document indexed into OpenSearch. */
interface IndexedDocument {
  documentId: string;
  tenantId: string;
  title: string;
  description: string | null;
  documentType: string | null;
  classificationId: string | null;
  sensitivityLevel: number;
  contentLanguage: string | null;
  textDirection: string | null;
  status: string;
  sizeBytes: string; // BigInt is not JSON-serialisable — convert to string.
  checksum: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  // Free-text body for full-text search. In a full implementation this
  // would include extracted text (OCR + document parsing). We currently
  // use the title/description only — extracted text will be added by the
  // scanner / DLA pipeline (spec §9.10, §9.16).
  bodyText: string;
}

/** Lazy-loaded OpenSearch client (or null when unavailable). */
type OpenSearchClient = {
  index: (params: {
    index: string;
    id: string;
    body: unknown;
    refresh?: boolean;
  }) => Promise<unknown>;
  delete: (params: { index: string; id: string; refresh?: boolean }) => Promise<unknown>;
  indices: {
    create: (params: { index: string }) => Promise<unknown>;
    exists: (params: { index: string }) => Promise<boolean>;
  };
};

@Injectable()
export class SearchIndexer {
  private readonly logger = new Logger(SearchIndexer.name);
  private readonly opensearchUrl: string | undefined;
  private clientPromise: Promise<OpenSearchClient | null> | null = null;
  private readonly readyIndices = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {
    this.opensearchUrl = this.config.get<string>('OPENSEARCH_URL') ?? undefined;
  }

  /**
   * Index (or re-index) a document. Fire-and-forget from the caller's
   * perspective — the caller does NOT `await` this method.
   *
   * In PG-fallback mode this is a no-op (the live table is the source of
   * truth for search). It still emits a `search.index.updated` WebSocket
   * event so connected clients can refresh their view.
   */
  async indexDocument(tenantId: string, documentId: string): Promise<void> {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, tenantId },
      include: {
        classification: { select: { id: true, code: true, sensitivityLevel: true } },
        metadataValues: { select: { fieldCode: true, value: true } },
      },
    });
    if (!doc) {
      this.logger.warn(`indexDocument: doc ${documentId} not found`);
      return;
    }

    // Build the indexed payload.
    const bodyText = [doc.title, doc.description ?? '', doc.documentType ?? '']
      .filter(Boolean)
      .join('\n');

    const payload: IndexedDocument = {
      documentId: doc.id,
      tenantId: doc.tenantId,
      title: doc.title,
      description: doc.description,
      documentType: doc.documentType,
      classificationId: doc.classificationId,
      sensitivityLevel: doc.sensitivityLevel,
      contentLanguage: doc.contentLanguage,
      textDirection: doc.textDirection,
      status: doc.status,
      sizeBytes: doc.sizeBytes.toString(),
      checksum: doc.checksum,
      createdByUserId: doc.createdByUserId,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      tags: doc.metadataValues.map((m) => m.fieldCode),
      bodyText,
    };

    const client = await this.getClient();
    if (client) {
      try {
        const idx = indexName(tenantId);
        await this.ensureIndex(client, idx);
        await client.index({ index: idx, id: doc.id, body: payload, refresh: false });
        this.logger.debug(`indexed doc ${doc.id} into OpenSearch index ${idx}`);
      } catch (err) {
        this.logger.warn(
          `OpenSearch index failed for doc ${doc.id}: ${(err as Error).message}`,
        );
      }
    } else {
      this.logger.debug(
        `indexDocument: PG-fallback mode — OpenSearch not configured; live table is source of truth`,
      );
    }

    // Always emit the WS event so connected clients can refresh.
    await this.emitWsEvent(tenantId, {
      name: DOCUMENT_WS_EVENTS.SEARCH_INDEX_UPDATED,
      tenantId,
      documentId: doc.id,
      occurredAt: new Date().toISOString(),
    });
  }

  /**
   * Remove a document from the search index. Called after soft-delete.
   */
  async removeDocument(tenantId: string, documentId: string): Promise<void> {
    const client = await this.getClient();
    if (client) {
      try {
        const idx = indexName(tenantId);
        await client.delete({ index: idx, id: documentId, refresh: false }).catch(() => undefined);
        this.logger.debug(`removed doc ${documentId} from OpenSearch index ${idx}`);
      } catch (err) {
        this.logger.warn(
          `OpenSearch delete failed for doc ${documentId}: ${(err as Error).message}`,
        );
      }
    }

    await this.emitWsEvent(tenantId, {
      name: DOCUMENT_WS_EVENTS.SEARCH_INDEX_UPDATED,
      tenantId,
      documentId,
      occurredAt: new Date().toISOString(),
    });
  }

  /**
   * Returns true if OpenSearch is wired up and ready. Exposed for the
   * SearchService so it can pick the right backend at query time.
   */
  async isOpensearchAvailable(): Promise<boolean> {
    const client = await this.getClient();
    return client !== null;
  }

  // -------------------------------------------------------------------------
  // Internal
  // -------------------------------------------------------------------------

  /**
   * Lazily load the OpenSearch client. Cached after first call. Returns
   * null if the package is not installed or `OPENSEARCH_URL` is unset.
   *
   * The import path is held in a `const` so TypeScript does not try to
   * resolve `@opensearch-project/opensearch` at compile time — this lets
   * the backend build without the optional OpenSearch dependency. Once
   * the package is added to `apps/backend/package.json`, the runtime
   * import succeeds and indexing activates automatically.
   */
  private async getClient(): Promise<OpenSearchClient | null> {
    if (!this.opensearchUrl) {return null;}
    if (this.clientPromise) {return this.clientPromise;}

    this.clientPromise = (async () => {
      try {
        // Non-literal module path → TS resolves to `Promise<any>`, so the
        // optional package is not required at compile time.
        const modulePath = '@opensearch-project/opensearch';
        const mod = (await import(/* @vite-ignore */ modulePath)) as {
          Client: new (opts: unknown) => OpenSearchClient;
        };
        const opts: Record<string, unknown> = { node: this.opensearchUrl };
        const username = this.config.get<string>('OPENSEARCH_USERNAME');
        const password = this.config.get<string>('OPENSEARCH_PASSWORD');
        if (username && password) {
          opts.auth = { username, password };
        }
        const client = new mod.Client(opts);
        this.logger.log(`OpenSearch client connected to ${this.opensearchUrl}`);
        return client;
      } catch (err) {
        this.logger.warn(
          `OpenSearch client not available — falling back to PostgreSQL search. ` +
            `Install @opensearch-project/opensearch to enable. Error: ${(err as Error).message}`,
        );
        return null;
      }
    })();

    return this.clientPromise;
  }

  /** Ensure the tenant's index exists before first write. */
  private async ensureIndex(client: OpenSearchClient, idx: string): Promise<void> {
    if (this.readyIndices.has(idx)) {return;}
    try {
      const exists = await client.indices.exists({ index: idx });
      if (!exists) {
        await client.indices.create({ index: idx });
      }
      this.readyIndices.add(idx);
    } catch (err) {
      this.logger.warn(`ensureIndex(${idx}) failed: ${(err as Error).message}`);
    }
  }

  private async emitWsEvent(tenantId: string, payload: unknown): Promise<void> {
    try {
      await this.redis.connection.publish(wsEventChannel(tenantId), JSON.stringify(payload));
    } catch (err) {
      this.logger.warn(`ws event publish failed: ${(err as Error).message}`);
    }
  }
}
