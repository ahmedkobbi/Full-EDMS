import { Controller, Get, Query, Req } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { KnowledgeGraphService } from './knowledge-graph.service';
import type { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard';

@Controller('v1/knowledge-graph')
export class KnowledgeGraphController {
  constructor(private readonly graph: KnowledgeGraphService) {}

  /**
   * Get the 3D knowledge graph for the tenant.
   * Spec ref: §9.10 (3D Knowledge Graph Explorer).
   * 3D graph queries must not return unbounded relationship data (spec §9.10).
   */
  @Roles('admin', 'auditor', 'security-officer')
  @Get()
  async getGraph(@Req() req: AuthenticatedRequest, @Query() query: unknown) {
    return this.graph.getGraph(req.user!.tid, query);
  }
}
