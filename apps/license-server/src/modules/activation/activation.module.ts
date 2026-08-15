import { Module } from '@nestjs/common';
import { ActivationController } from './activation.controller.js';
import { ActivationService } from './activation.service.js';
import { LicenseModule } from '../license/license.module.js';
import { WebhookModule } from '../webhook/webhook.module.js';

@Module({
  imports: [LicenseModule, WebhookModule],
  controllers: [ActivationController],
  providers: [ActivationService],
  exports: [ActivationService],
})
export class ActivationModule {}
