/**
 * Smart EDMS — Search REST controller.
 *
 * Endpoints (all JWT-protected, tenant-scoped):
 *   GET    /v1/search                  full-text + metadata search (paginated)
 *   POST   /v1/search/saved            save a search query
 *   GET    /v1/search/saved            list saved searches (paginated)
 *   DELETE /v1/search/saved/:id        delete a saved search (owner or admin)
 *   POST   /v1/search/flex             flex search across all metadata dims
 *
 * Permission-aware filtering is enforced in SearchService — inaccessible
 * documents are excluded BEFORE pagination so totals and cursors never
 * reveal their existence (spec §9.10 critical rule).
 *
 * Spec ref: §9.10 (search), §14 (API contract), §14.3 (cursor pagination),
 * §27.3 (audit + access control).
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { z } from 'zod';
import { Audit } from '../../common/decorators/audit.decorator';
import type { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard';
import { SearchService } from './search.service';

// ---------------------------------------------------------------------------
// Zod schemas for request bodies / queries
// ---------------------------------------------------------------------------

const SearchQuerySchema = z
  .object({
    q: z.string().min(1).max(2048).optional(),
    documentType: z.string().min(1).max(64).optional(),
    classificationId: z.string().uuid().optional(),
    status: z
      .enum(['ACTIVE', 'ARCHIVED', 'RECORD', 'PROCESSING', 'QUARANTINED'])
      .optional(),
    createdByUserId: z.string().uuid().optional(),
    folderId: z.string().uuid().optional(),
    createdAfter: z.string().datetime().optional(),
    createdBefore: z.string().datetime().optional(),
    updatedAfter: z.string().datetime().optional(),
    updatedBefore: z.string().datetime().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    cursor: z.string().min(1).max(1024).optional(),
    sort: z.enum(['createdAt', 'updatedAt', 'title', 'relevance']).default('updatedAt'),
    order: z.enum(['asc', 'desc']).default('desc'),
    // Boolean query params arrive as strings — use enum transform to avoid
    // the `z.coerce.boolean()` gotcha (every non-empty string → true).
    includeDeleted: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
  })
  .strict();

const FlexSearchBodySchema = z
  .object({
    text: z.string().min(1).max(4096),
    documentTypes: z.array(z.string().min(1).max(64)).max(50).optional(),
    classificationIds: z.array(z.string().uuid()).max(50).optional(),
    createdAfter: z.string().datetime().optional(),
    createdBefore: z.string().datetime().optional(),
    limit: z.number().int().min(1).max(100).default(50),
    cursor: z.string().min(1).max(1024).nullable().optional(),
    multimodal: z.boolean().default(false),
    graphTraversal: z.boolean().default(false),
  })
  .strict();

const SaveSearchBodySchema = z
  .object({
    name: z.string().min(1).max(200),
    query: z.record(z.string(), z.unknown()),
    alertEnabled: z.boolean().default(false),
    alertInterval: z.enum(['hourly', 'daily', 'weekly']).optional(),
  })
  .strict();

const SavedListQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    cursor: z.string().min(1).max(1024).optional(),
  })
  .strict();

@Controller('v1/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @Audit({
    category: 'read',
    code: 'document.read',
    resourceType: 'search',
  })
  async search(@Query() query: unknown, @Req() req: AuthenticatedRequest) {
    const parsed = SearchQuerySchema.parse(query);
    // `includeDeleted` is admin-only — strip it for non-admins.
    if (!req.user!.roles?.includes('admin')) {
      parsed.includeDeleted = false;
    }
    return this.searchService.search({
      tenantId: req.user!.tid,
      userId: req.user!.sub,
      userRoles: req.user!.roles ?? [],
      text: parsed.q,
      documentType: parsed.documentType,
      classificationId: parsed.classificationId,
      status: parsed.status,
      createdByUserId: parsed.createdByUserId,
      folderId: parsed.folderId,
      createdAfter: parsed.createdAfter,
      createdBefore: parsed.createdBefore,
      updatedAfter: parsed.updatedAfter,
      updatedBefore: parsed.updatedBefore,
      limit: parsed.limit,
      cursor: parsed.cursor,
      sort: parsed.sort,
      order: parsed.order,
      includeDeleted: parsed.includeDeleted,
    });
  }

  @Post('flex')
  @Audit({
    category: 'read',
    code: 'document.read',
    resourceType: 'search',
  })
  @HttpCode(200)
  async flexSearch(@Body() body: unknown, @Req() req: AuthenticatedRequest) {
    const parsed = FlexSearchBodySchema.parse(body);
    return this.searchService.flexSearch({
      tenantId: req.user!.tid,
      userId: req.user!.sub,
      userRoles: req.user!.roles ?? [],
      text: parsed.text,
      documentTypes: parsed.documentTypes,
      classificationIds: parsed.classificationIds,
      createdAfter: parsed.createdAfter,
      createdBefore: parsed.createdBefore,
      limit: parsed.limit,
      cursor: parsed.cursor ?? undefined,
      multimodal: parsed.multimodal,
      graphTraversal: parsed.graphTraversal,
    });
  }

  @Post('saved')
  @Audit({
    category: 'create',
    code: 'document.read', // No dedicated code for saved-search create.
    resourceType: 'saved_search',
  })
  @HttpCode(201)
  async saveSearch(@Body() body: unknown, @Req() req: AuthenticatedRequest) {
    const parsed = SaveSearchBodySchema.parse(body);
    return this.searchService.saveSearch(
      req.user!.tid,
      req.user!.sub,
      parsed,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Get('saved')
  async listSaved(@Query() query: unknown, @Req() req: AuthenticatedRequest) {
    const parsed = SavedListQuerySchema.parse(query);
    return this.searchService.listSavedSearches(req.user!.tid, req.user!.sub, parsed);
  }

  @Delete('saved/:id')
  @Audit({
    category: 'delete',
    code: 'document.read', // No dedicated code for saved-search delete.
    resourceType: 'saved_search',
    resourceIdParam: 'id',
  })
  async deleteSaved(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.searchService.deleteSavedSearch(
      req.user!.tid,
      req.user!.sub,
      id,
      req.user!.roles ?? [],
      req.ip,
      req.headers['user-agent'],
    );
  }
}
