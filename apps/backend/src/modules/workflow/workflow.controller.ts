/**
 * Smart EDMS — Workflow REST controller (spec §9.8).
 *
 * All endpoints are JWT-protected, tenant-scoped, audited.
 *
 * Endpoint summary:
 *
 *   POST   /v1/workflows                          create definition (BPMN/CMMN/DMN)
 *   GET    /v1/workflows                          list definitions (paginated)
 *   GET    /v1/workflows/:id                      get definition with XML + JSON
 *   PATCH  /v1/workflows/:id                      update draft
 *   POST   /v1/workflows/:id/publish              publish a draft
 *   POST   /v1/workflows/:id/instantiate          start an instance
 *   GET    /v1/workflows/instances                list instances (paginated)
 *   GET    /v1/workflows/instances/:id            get instance with steps + approvals
 *   POST   /v1/workflows/instances/:id/approve    submit approval decision
 *   POST   /v1/workflows/instances/:id/delegate   delegate current step
 *   POST   /v1/workflows/instances/:id/cancel     cancel instance
 */

import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Audit } from '../../common/decorators/audit.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { LicenseRequired } from '../../common/decorators/license-required.decorator';
import type { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard';
import { WorkflowService } from './workflow.service';
import {
  CancelInstanceBodySchema,
  CreateWorkflowBodySchema,
  DelegateStepBodySchema,
  InstantiateWorkflowBodySchema,
  SubmitApprovalBodySchema,
  UpdateWorkflowBodySchema,
  WorkflowInstanceListQuerySchema,
  WorkflowListQuerySchema,
  type CancelInstanceBody,
  type CreateWorkflowBody,
  type DelegateStepBody,
  type InstantiateWorkflowBody,
  type SubmitApprovalBody,
  type UpdateWorkflowBody,
  type WorkflowInstanceListQuery,
  type WorkflowListQuery,
} from './dto';

@Controller('v1/workflows')
@Roles('admin', 'workflow-designer', 'records-manager', 'editor')
export class WorkflowController {
  constructor(private readonly workflows: WorkflowService) {}

  // -------------------------------------------------------------------------
  // Definition CRUD
  // -------------------------------------------------------------------------

  @Post()
  @LicenseRequired({ module: 'bpmn', failClosed: false })
  @Audit({ category: 'workflow', code: 'workflow.started', resourceType: 'workflow_definition' })
  @HttpCode(200)
  async create(@Body() body: unknown, @Req() req: AuthenticatedRequest) {
    const parsed = CreateWorkflowBodySchema.parse(body) as CreateWorkflowBody;
    return this.workflows.createDefinition(req.user!.tid, req.user!.sub, parsed);
  }

  @Get()
  async list(@Query() query: unknown, @Req() req: AuthenticatedRequest) {
    const parsed = WorkflowListQuerySchema.parse(query) as WorkflowListQuery;
    // Non-designers cannot see AI drafts.
    if (!req.user!.roles?.includes('admin') && !req.user!.roles?.includes('workflow-designer')) {
      parsed.includeAiDrafts = false;
    }
    return this.workflows.listDefinitions(req.user!.tid, parsed);
  }

  @Get('instances')
  async listInstances(@Query() query: unknown, @Req() req: AuthenticatedRequest) {
    const parsed = WorkflowInstanceListQuerySchema.parse(query) as WorkflowInstanceListQuery;
    return this.workflows.listInstances(req.user!.tid, parsed);
  }

  @Get(':id')
  async getOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.workflows.getDefinition(req.user!.tid, id);
  }

  @Patch(':id')
  @Audit({ category: 'workflow', code: 'workflow.step_updated', resourceType: 'workflow_definition', resourceIdParam: 'id' })
  async update(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest,
  ) {
    const parsed = UpdateWorkflowBodySchema.parse(body) as UpdateWorkflowBody;
    return this.workflows.updateDefinition(req.user!.tid, req.user!.sub, id, parsed);
  }

  @Post(':id/publish')
  @Roles('admin', 'workflow-designer')
  @Audit({ category: 'workflow', code: 'workflow.step_updated', resourceType: 'workflow_definition', resourceIdParam: 'id' })
  @HttpCode(200)
  async publish(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.workflows.publishDefinition(req.user!.tid, req.user!.sub, id);
  }

  @Post(':id/instantiate')
  @Audit({ category: 'workflow', code: 'workflow.started', resourceType: 'workflow_instance' })
  @HttpCode(200)
  async instantiate(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest,
  ) {
    const parsed = InstantiateWorkflowBodySchema.parse(body ?? {}) as InstantiateWorkflowBody;
    return this.workflows.instantiate(req.user!.tid, req.user!.sub, id, parsed);
  }
}

// ---------------------------------------------------------------------------
// Instance controller
// ---------------------------------------------------------------------------

@Controller('v1/workflows/instances')
export class WorkflowInstanceController {
  constructor(private readonly workflows: WorkflowService) {}

  @Get(':id')
  async getOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.workflows.getInstance(req.user!.tid, id);
  }

  /** List pending approvals for the current user (spec §9.8). */
  @Get('approvals/pending')
  async listPendingApprovals(@Req() req: AuthenticatedRequest) {
    return this.workflows.listPendingApprovals(req.user!.tid, req.user!.sub);
  }

  @Post(':id/approve')
  @Audit({ category: 'workflow', code: 'workflow.approval_completed', resourceType: 'workflow_instance', resourceIdParam: 'id' })
  @HttpCode(200)
  async approve(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest,
  ) {
    const parsed = SubmitApprovalBodySchema.parse(body) as SubmitApprovalBody;
    return this.workflows.submitApproval(req.user!.tid, req.user!.sub, id, parsed);
  }

  @Post(':id/delegate')
  @Audit({ category: 'workflow', code: 'workflow.approval_completed', resourceType: 'workflow_instance', resourceIdParam: 'id' })
  @HttpCode(200)
  async delegate(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest,
  ) {
    const parsed = DelegateStepBodySchema.parse(body) as DelegateStepBody;
    return this.workflows.delegateStep(req.user!.tid, req.user!.sub, id, parsed);
  }

  @Post(':id/cancel')
  @Audit({ category: 'workflow', code: 'workflow.cancelled', resourceType: 'workflow_instance', resourceIdParam: 'id' })
  @HttpCode(200)
  async cancel(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest,
  ) {
    const parsed = CancelInstanceBodySchema.parse(body ?? {}) as CancelInstanceBody;
    return this.workflows.cancelInstance(req.user!.tid, req.user!.sub, id, parsed);
  }
}
