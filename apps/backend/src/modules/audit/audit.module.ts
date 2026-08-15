import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditApiService } from './audit.service';

@Module({
  controllers: [AuditController],
  providers: [AuditApiService],
  exports: [AuditApiService],
})
export class AuditApiModule {}
