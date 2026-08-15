import { Controller, Get, Req } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminService } from './admin.service';
import type { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard';

@Controller('v1/admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Roles('admin')
  @Get('dashboard')
  dashboard(@Req() req: AuthenticatedRequest) {
    return this.admin.getDashboard(req.user!.tid);
  }

  @Roles('admin', 'it-administrator')
  @Get('system-usage')
  systemUsage(@Req() req: AuthenticatedRequest) {
    return this.admin.getSystemUsage(req.user!.tid);
  }

  @Roles('admin', 'it-administrator')
  @Get('health')
  health() {
    return this.admin.getHealth();
  }
}
