import { Body, Controller, Get, Patch, Post, Query, Req } from '@nestjs/common';
import { NotificationService } from './notification.service';
import type { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard';

@Controller('v1/notifications')
export class NotificationController {
  constructor(private readonly notifications: NotificationService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest, @Query() q: unknown) {
    return this.notifications.listForUser(req.user!.tid, req.user!.sub, q);
  }

  @Post('mark-read')
  markRead(@Req() req: AuthenticatedRequest, @Body() body: { id: string }) {
    return this.notifications.markRead(req.user!.tid, req.user!.sub, body.id);
  }

  @Post('mark-all-read')
  markAllRead(@Req() req: AuthenticatedRequest) {
    return this.notifications.markAllRead(req.user!.tid, req.user!.sub);
  }

  // ── §9.13 Notification preferences ───────────────────────────────────────

  @Get('preferences')
  getPreferences(@Req() req: AuthenticatedRequest) {
    return this.notifications.getPreferences(req.user!.tid, req.user!.sub);
  }

  @Patch('preferences')
  updatePreferences(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.notifications.updatePreferences(req.user!.tid, req.user!.sub, body);
  }
}
