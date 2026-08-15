import { Module } from '@nestjs/common';
import { RevocationController } from './revocation.controller.js';
import { RevocationService } from './revocation.service.js';

@Module({
  controllers: [RevocationController],
  providers: [RevocationService],
  exports: [RevocationService],
})
export class RevocationModule {}
