import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller.js';
import { WebhookService } from './webhook.service.js';
import { WebhookWorker } from './webhook-worker.js';

@Module({
  controllers: [WebhookController],
  providers: [WebhookService, WebhookWorker],
  exports: [WebhookService],
})
export class WebhookModule {}
