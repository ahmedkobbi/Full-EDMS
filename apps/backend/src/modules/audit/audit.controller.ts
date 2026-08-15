import { Controller, Get, Post, Query, Req } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Audit } from '../../common/decorators/audit.decorator.js';
import { AuditApiService } from './audit.service.js';
import type { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard.js';

@Controller('v1/audit')
export class AuditController {
  constructor(private readonly audit: AuditApiService) {}

  @Roles('admin', 'auditor', 'security-officer')
  @Get('events')
  query(@Req() req: AuthenticatedRequest, @Query() q: unknown) {
    return this.audit.query(req.user!.tid, q);
  }

  @Roles('admin', 'auditor')
  @Get('verify-chain')
  verifyChain(@Req() req: AuthenticatedRequest) {
    return this.audit.verifyChain(req.user!.tid);
  }

  @Roles('admin', 'auditor')
  @Audit({ category: 'audit', code: 'audit.export.request' })
  @Post('export')
  export(@Req() req: AuthenticatedRequest, @Query() q: unknown) {
    return this.audit.requestExport(req.user!.tid, req.user!.sub, q);
  }
}
