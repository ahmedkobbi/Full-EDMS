import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { NotificationService } from './notification.service.js';
import type { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard.js';

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
}
