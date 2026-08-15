import { Global, Module } from '@nestjs/common';
import { CaptureRulesController } from './capture-rules.controller';
import { CaptureRulesService } from './capture-rules.service';

@Global()
@Module({
  controllers: [CaptureRulesController],
  providers: [CaptureRulesService],
  exports: [CaptureRulesService],
})
export class CaptureRulesModule {}
