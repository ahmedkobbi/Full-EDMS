import { Module } from '@nestjs/common';
import { LicenseController } from './license.controller';
import { LicenseService } from './license.service';
import { LicenseHeartbeatCron } from './license-heartbeat-cron';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [LicenseController],
  providers: [LicenseService, LicenseHeartbeatCron],
  exports: [LicenseService],
})
export class LicenseModule {}
