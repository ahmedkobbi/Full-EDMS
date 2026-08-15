import { Global, Module } from '@nestjs/common';
import { CaptureRulesController } from './capture-rules.controller.js';
import { CaptureRulesService } from './capture-rules.service.js';

@Global()
@Module({
  controllers: [CaptureRulesController],
  providers: [CaptureRulesService],
  exports: [CaptureRulesService],
})
export class CaptureRulesModule {}
