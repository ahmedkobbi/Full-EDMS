import { Global, Module } from '@nestjs/common';
import { KnowledgeGraphController } from './knowledge-graph.controller.js';
import { KnowledgeGraphService } from './knowledge-graph.service.js';

@Global()
@Module({
  controllers: [KnowledgeGraphController],
  providers: [KnowledgeGraphService],
  exports: [KnowledgeGraphService],
})
export class KnowledgeGraphModule {}
