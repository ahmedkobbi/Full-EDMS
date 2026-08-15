import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller.js';
import { AuditApiService } from './audit.service.js';

@Module({
  controllers: [AuditController],
  providers: [AuditApiService],
  exports: [AuditApiService],
})
export class AuditApiModule {}
