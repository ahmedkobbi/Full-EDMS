import { Body, Controller, Delete, Get, Param, Post, Req } from '@nestjs/common';
import { Audit } from '../../common/decorators/audit.decorator.js';
import { ShareService } from './share.service.js';
import type { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard.js';

@Controller('v1/share')
export class ShareController {
  constructor(private readonly share: ShareService) {}

  @Audit({ category: 'share', code: 'share.link.create' })
  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.share.create(req.user!.tid, req.user!.sub, body);
  }

  @Get('documents/:documentId')
  list(@Req() req: AuthenticatedRequest, @Param('documentId') documentId: string) {
    return this.share.list(req.user!.tid, documentId);
  }

  @Audit({ category: 'share', code: 'share.link.revoke' })
  @Delete(':id')
  async revoke(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    await this.share.revoke(req.user!.tid, req.user!.sub, id);
    return { ok: true };
  }
}
