import { Module } from '@nestjs/common';
import { HeartbeatController } from './heartbeat.controller.js';
import { HeartbeatService } from './heartbeat.service.js';
import { LicenseModule } from '../license/license.module.js';
import { WebhookModule } from '../webhook/webhook.module.js';

@Module({
  imports: [LicenseModule, WebhookModule],
  controllers: [HeartbeatController],
  providers: [HeartbeatService],
  exports: [HeartbeatService],
})
export class HeartbeatModule {}
