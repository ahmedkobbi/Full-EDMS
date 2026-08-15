import { Module } from '@nestjs/common';
import { LicenseController } from './license.controller.js';
import { LicenseService } from './license.service.js';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [LicenseController],
  providers: [LicenseService],
  exports: [LicenseService],
})
export class LicenseModule {}
