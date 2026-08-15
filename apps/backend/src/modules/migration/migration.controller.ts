import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { Audit } from '../../common/decorators/audit.decorator';
import { MigrationService } from './migration.service';
import type { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard';

@Controller('v1/migration')
export class MigrationController {
  constructor(private readonly migration: MigrationService) {}

  @Roles('admin', 'it-administrator')
  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.migration.listMigrations(req.user!.tid);
  }

  @Roles('admin', 'it-administrator')
  @Audit({ category: 'admin', code: 'admin.migration.create' })
  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.migration.createMigration(req.user!.tid, req.user!.sub, body);
  }

  @Roles('admin', 'it-administrator')
  @Get(':jobId/status')
  status(@Req() req: AuthenticatedRequest, @Param('jobId') jobId: string) {
    return this.migration.getMigrationStatus(req.user!.tid, jobId);
  }

  @Roles('admin', 'it-administrator')
  @Post(':jobId/cancel')
  cancel(@Req() req: AuthenticatedRequest, @Param('jobId') jobId: string) {
    return this.migration.cancelMigration(req.user!.tid, jobId);
  }
}
