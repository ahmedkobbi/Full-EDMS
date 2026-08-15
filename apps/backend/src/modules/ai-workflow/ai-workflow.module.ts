import { Global, Module } from '@nestjs/common';
import { AiWorkflowController } from './ai-workflow.controller.js';
import { AiWorkflowService } from './ai-workflow.service.js';

@Global()
@Module({
  controllers: [AiWorkflowController],
  providers: [AiWorkflowService],
  exports: [AiWorkflowService],
})
export class AiWorkflowModule {}
