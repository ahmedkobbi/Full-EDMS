import { Global, Module } from '@nestjs/common';
import { AiWorkflowController } from './ai-workflow.controller';
import { AiWorkflowService } from './ai-workflow.service';

@Global()
@Module({
  controllers: [AiWorkflowController],
  providers: [AiWorkflowService],
  exports: [AiWorkflowService],
})
export class AiWorkflowModule {}
