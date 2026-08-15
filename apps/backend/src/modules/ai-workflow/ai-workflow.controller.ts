import { Body, Controller, Post, Req } from '@nestjs/common';
import { Audit } from '../../common/decorators/audit.decorator.js';
import { LicenseRequired } from '../../common/decorators/license-required.decorator.js';
import { AiWorkflowService } from './ai-workflow.service.js';
import type { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard.js';

@Controller('v1/ai-workflow')
export class AiWorkflowController {
  constructor(private readonly aiWorkflow: AiWorkflowService) {}

  /**
   * Generate a workflow definition draft from a natural language description.
   * The draft is saved with isAiDraft=true and cannot be published without
   * human review.
   *
   * Spec ref: §9.8 (AI Workflow Generation).
   */
  @Post('generate')
  @Audit({ category: 'workflow', code: 'workflow.ai.generate' })
  async generate(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.aiWorkflow.generateWorkflowDraft(req.user!.tid, req.user!.sub, body);
  }

  /**
   * Agentic Document Negotiator: analyze a contract against DMN policy,
   * draft redlines + risk memo, route pre-filled approval workflow.
   *
   * Spec ref: §9.8 (Agentic Document Negotiators).
   */
  @Post('negotiate')
  @Audit({ category: 'workflow', code: 'workflow.ai.negotiate' })
  async negotiate(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.aiWorkflow.negotiateContract(req.user!.tid, req.user!.sub, body);
  }
}
