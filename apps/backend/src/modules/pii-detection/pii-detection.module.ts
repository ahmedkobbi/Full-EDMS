import { Global, Module } from '@nestjs/common';
import { PiiDetectionController } from './pii-detection.controller';
import { PiiDetectionService } from './pii-detection.service';

@Global()
@Module({
  controllers: [PiiDetectionController],
  providers: [PiiDetectionService],
  exports: [PiiDetectionService],
})
export class PiiDetectionModule {}
