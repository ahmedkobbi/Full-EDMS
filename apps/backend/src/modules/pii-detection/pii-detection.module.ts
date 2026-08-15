import { Global, Module } from '@nestjs/common';
import { PiiDetectionController } from './pii-detection.controller.js';
import { PiiDetectionService } from './pii-detection.service.js';

@Global()
@Module({
  controllers: [PiiDetectionController],
  providers: [PiiDetectionService],
  exports: [PiiDetectionService],
})
export class PiiDetectionModule {}
