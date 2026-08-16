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
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { WebhookService } from './webhook.service.js';
import { type AdminAuthenticatedRequest, AdminJwtGuard } from '../../security/admin-jwt.guard.js';
import { AuditAction } from '../../common/decorators/audit-action.decorator.js';

/**
 * Webhook admin endpoints.
 *
 * Spec ref: §12 (webhook events).
 *
 * - POST   /v1/webhooks                — create a webhook (admin)
 * - GET    /v1/webhooks?customerId=    — list webhooks for a customer (admin)
 * - DELETE /v1/webhooks/:id            — delete a webhook (admin)
 * - GET    /v1/webhooks/:id/deliveries — list delivery attempts (admin)
 * - POST   /v1/webhooks/deliveries/:id/replay — replay a delivery (admin)
 */
@ApiTags('webhooks')
@Controller('v1/webhooks')
@UseGuards(AdminJwtGuard)
export class WebhookController {
  constructor(private readonly webhook: WebhookService) {}

  @Post()
  @AuditAction('webhook.create')
  @ApiOperation({ summary: 'Create a webhook for a customer (admin)' })
  async create(@Body() body: unknown, @Req() req: AdminAuthenticatedRequest) {
    return this.webhook.createWebhook(body as never, req.admin!.sub, req.ip);
  }

  @Get()
  @ApiOperation({ summary: 'List webhooks for a customer (admin)' })
  async list(@Query('customerId') customerId: string) {
    return this.webhook.listWebhooks(customerId);
  }

  @Delete(':id')
  @AuditAction('webhook.delete')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a webhook (admin)' })
  async delete(@Param('id') id: string, @Req() req: AdminAuthenticatedRequest) {
    await this.webhook.deleteWebhook(id, req.admin!.sub, req.ip);
  }

  @Get(':id/deliveries')
  @ApiOperation({ summary: 'List delivery attempts for a webhook (admin)' })
  async listDeliveries(@Param('id') id: string, @Query('limit') limit: string | undefined) {
    return this.webhook.listDeliveries(id, limit ? Number(limit) : 50);
  }

  @Post('deliveries/:id/replay')
  @AuditAction('webhook.replay')
  @HttpCode(200)
  @ApiOperation({ summary: 'Manually replay a webhook delivery (admin)' })
  async replay(@Param('id') id: string, @Req() req: AdminAuthenticatedRequest) {
    return this.webhook.replayDelivery(id, req.admin!.sub, req.ip);
  }

  /**
   * Send a test event to a webhook (spec §12.10 — webhook test).
   */
  @Post(':id/test')
  @AuditAction('webhook.test')
  @HttpCode(200)
  @ApiOperation({ summary: 'Send a test event to a webhook (admin)' })
  async test(@Param('id') id: string, @Req() req: AdminAuthenticatedRequest) {
    return this.webhook.sendTestEvent(id, req.admin!.sub, req.ip);
  }
}
