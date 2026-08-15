/**
 * Smart EDMS — Legal Hold REST controller (spec §9.7).
 *
 * Endpoints (all JWT-protected, tenant-scoped, audited):
 *
 *   POST   /v1/legal-holds                              create hold
 *   GET    /v1/legal-holds                              list holds
 *   GET    /v1/legal-holds/:id                          get hold with documents
 *   POST   /v1/legal-holds/:id/documents/:documentId    attach document
 *   DELETE /v1/legal-holds/:id/documents/:documentId    detach document
 *   POST   /v1/legal-holds/:id/release                  release hold (admin only)
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
import { Audit } from '../../common/decorators/audit.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import type { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard.js';
import { LegalHoldService } from './legal-hold.service.js';
import {
  CreateLegalHoldBodySchema,
  LegalHoldListQuerySchema,
  ReleaseLegalHoldBodySchema,
  type CreateLegalHoldBody,
  type LegalHoldListQuery,
  type ReleaseLegalHoldBody,
} from './legal-hold.service.js';

@Controller('v1/legal-holds')
@Roles('admin', 'records-manager', 'compliance-officer')
export class LegalHoldController {
  constructor(private readonly holds: LegalHoldService) {}

  @Post()
  @Roles('admin', 'records-manager')
  @Audit({ category: 'legal_hold', code: 'legal_hold.applied', resourceType: 'legal_hold' })
  @HttpCode(200)
  async create(@Body() body: unknown, @Req() req: AuthenticatedRequest) {
    const parsed = CreateLegalHoldBodySchema.parse(body) as CreateLegalHoldBody;
    return this.holds.createHold(req.user!.tid, req.user!.sub, parsed);
  }

  @Get()
  async list(@Query() query: unknown, @Req() req: AuthenticatedRequest) {
    const parsed = LegalHoldListQuerySchema.parse(query) as LegalHoldListQuery;
    return this.holds.listHolds(req.user!.tid, parsed);
  }

  @Get(':id')
  async getOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.holds.getHold(req.user!.tid, id);
  }

  @Post(':id/documents/:documentId')
  @Roles('admin', 'records-manager')
  @Audit({
    category: 'legal_hold',
    code: 'legal_hold.applied',
    resourceType: 'legal_hold',
    resourceIdParam: 'id',
    documentIdParam: 'documentId',
  })
  @HttpCode(200)
  async attach(
    @Param('id') id: string,
    @Param('documentId') documentId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.holds.attachDocument(req.user!.tid, req.user!.sub, id, documentId);
  }

  @Delete(':id/documents/:documentId')
  @Roles('admin', 'records-manager')
  @Audit({
    category: 'legal_hold',
    code: 'legal_hold.released',
    resourceType: 'legal_hold',
    resourceIdParam: 'id',
    documentIdParam: 'documentId',
  })
  async detach(
    @Param('id') id: string,
    @Param('documentId') documentId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.holds.detachDocument(req.user!.tid, req.user!.sub, id, documentId);
  }

  /**
   * Release a hold. Admin-only (spec §9.7). Requires an explicit reason
   * key. Audited.
   */
  @Post(':id/release')
  @Roles('admin')
  @Audit({ category: 'legal_hold', code: 'legal_hold.released', resourceType: 'legal_hold', resourceIdParam: 'id' })
  @HttpCode(200)
  async release(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest,
  ) {
    const parsed = ReleaseLegalHoldBodySchema.parse(body) as ReleaseLegalHoldBody;
    return this.holds.releaseHold(req.user!.tid, req.user!.sub, id, parsed);
  }
}
