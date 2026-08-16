import { Module } from '@nestjs/common';
import { LicenseController } from './license.controller';
import { LicenseService } from './license.service';
import { LicenseHeartbeatCron } from './license-heartbeat-cron';
import { EnterpriseLicenseValidator } from './enterprise-license.validator';
import { SecurityModule } from '../security/security.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [ScheduleModule.forRoot(), SecurityModule],
  controllers: [LicenseController],
  providers: [LicenseService, LicenseHeartbeatCron, EnterpriseLicenseValidator],
  exports: [LicenseService, EnterpriseLicenseValidator],
})
export class LicenseModule {}
