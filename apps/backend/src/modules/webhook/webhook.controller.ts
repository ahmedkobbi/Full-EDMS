import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { Audit } from '../../common/decorators/audit.decorator';
import { WebhookService } from './webhook.service';
import type { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard';

@Controller('v1/webhooks')
export class WebhookController {
  constructor(private readonly webhooks: WebhookService) {}

  @Roles('admin')
  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.webhooks.list(req.user!.tid);
  }

  @Roles('admin')
  @Get(':id')
  getById(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.webhooks.getById(req.user!.tid, id);
  }

  @Roles('admin')
  @Audit({ category: 'admin', code: 'webhook.create' })
  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.webhooks.create(req.user!.tid, req.user!.sub, body);
  }

  @Roles('admin')
  @Audit({ category: 'admin', code: 'webhook.update', resourceType: 'webhook', resourceIdParam: 'id' })
  @Patch(':id')
  update(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.webhooks.update(req.user!.tid, req.user!.sub, id, body);
  }

  @Roles('admin')
  @Audit({ category: 'admin', code: 'webhook.delete', resourceType: 'webhook', resourceIdParam: 'id' })
  @Delete(':id')
  async delete(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    await this.webhooks.delete(req.user!.tid, req.user!.sub, id);
    return { ok: true };
  }

  @Roles('admin')
  @Post(':id/test')
  test(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.webhooks.sendTestEvent(req.user!.tid, req.user!.sub, id);
  }
}
