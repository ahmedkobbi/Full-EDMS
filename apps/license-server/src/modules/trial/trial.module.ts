import { Module } from '@nestjs/common';
import { TrialController } from './trial.controller.js';
import { TrialService } from './trial.service.js';
import { LicenseModule } from '../license/license.module.js';
import { WebhookModule } from '../webhook/webhook.module.js';

@Module({
  imports: [LicenseModule, WebhookModule],
  controllers: [TrialController],
  providers: [TrialService],
  exports: [TrialService],
})
export class TrialModule {}
