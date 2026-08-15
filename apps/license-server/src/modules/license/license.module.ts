import { Module } from '@nestjs/common';
import { LicenseController } from './license.controller.js';
import { LicenseService } from './license.service.js';
import { LicenseSigner } from './license-signer.js';
import { WebhookModule } from '../webhook/webhook.module.js';

@Module({
  imports: [WebhookModule],
  controllers: [LicenseController],
  providers: [LicenseService, LicenseSigner],
  exports: [LicenseService, LicenseSigner],
})
export class LicenseModule {}
