import { Module } from '@nestjs/common';
import { LicenseController } from './license.controller';
import { LicenseService } from './license.service';
import { LicenseHeartbeatCron } from './license-heartbeat-cron';
import { EnterpriseLicenseValidator } from './enterprise-license.validator';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [LicenseController],
  providers: [LicenseService, LicenseHeartbeatCron, EnterpriseLicenseValidator],
  exports: [LicenseService, EnterpriseLicenseValidator],
})
export class LicenseModule {}
