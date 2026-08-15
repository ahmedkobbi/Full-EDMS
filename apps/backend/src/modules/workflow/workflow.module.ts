/**
 * Smart EDMS — Workflow NestJS module (spec §9.8).
 *
 * Wires the Workflow controller + service with its dependencies:
 *  - PrismaService (global, from PrismaModule)
 *  - AuditService (global, from AuditModule)
 *  - RedisService (global, from RedisModule) — used for the BullMQ queue
 *
 * The BullMQ worker is set up here too. It listens on the
 * `smart-edms:workflow` queue and forwards jobs to
 * `WorkflowService.processInstance`. Workers are optional — if no worker
 * is running, jobs accumulate in Redis until one comes online.
 */

import { Module, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { Worker } from 'bullmq';
import { WorkflowController, WorkflowInstanceController } from './workflow.controller.js';
import { WorkflowService, WORKFLOW_QUEUE_NAME } from './workflow.service.js';
import { RedisService } from '../../common/redis.service.js';

@Module({
  controllers: [WorkflowController, WorkflowInstanceController],
  providers: [WorkflowService],
  exports: [WorkflowService],
})
export class WorkflowModule implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkflowModule.name);
  private worker?: Worker;

  constructor(
    private readonly workflows: WorkflowService,
    private readonly redis: RedisService,
  ) {}

  onModuleInit(): void {
    // Start the BullMQ worker. The worker calls `processInstance` for each
    // job; the method is idempotent so duplicate deliveries are safe.
    this.worker = new Worker(
      WORKFLOW_QUEUE_NAME,
      async (job) => {
        const { instanceId, tenantId } = job.data as { instanceId: string; tenantId: string };
        if (!instanceId || !tenantId) {
          this.logger.warn(`worker: job ${job.id} missing instanceId/tenantId`);
          return;
        }
        await this.workflows.processInstance(instanceId, tenantId);
      },
      {
        connection: this.redis.connection,
        concurrency: 4,
      },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `workflow job ${job?.id} failed: ${err.message}`,
        err.stack,
      );
    });

    this.logger.log(`BullMQ worker started on queue "${WORKFLOW_QUEUE_NAME}"`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }
}
