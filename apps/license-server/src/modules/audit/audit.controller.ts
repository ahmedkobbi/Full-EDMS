import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service.js';
import { AdminJwtGuard } from '../../security/admin-jwt.guard.js';

/**
 * Audit log admin endpoints.
 *
 * Spec ref: §12.1 (license server audit log), §21.7 (logging and monitoring),
 * §24.2 (compliance — audit log integrity verification).
 */
@ApiTags('audit')
@Controller('v1/audit')
@UseGuards(AdminJwtGuard)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  /**
   * List audit log entries, paginated, filtered by action / customerId.
   */
  @Get()
  @ApiOperation({ summary: 'List audit log entries' })
  async list(
    @Query('limit') limit: string | undefined,
    @Query('cursor') cursor: string | undefined,
    @Query('action') action: string | undefined,
    @Query('customerId') customerId: string | undefined,
  ) {
    return this.audit.list({
      limit: limit ? Number(limit) : 100,
      cursor: cursor ? Number(cursor) : undefined,
      action,
      customerId,
    });
  }

  /**
   * Verify the audit hash chain integrity. Returns the first broken
   * sequence number, or `{ ok: true }` if intact.
   */
  @Get('verify')
  @ApiOperation({ summary: 'Verify audit hash chain integrity' })
  async verify(@Query('limit') limit: string | undefined) {
    return this.audit.verifyHashChain(limit ? Number(limit) : undefined);
  }
}
