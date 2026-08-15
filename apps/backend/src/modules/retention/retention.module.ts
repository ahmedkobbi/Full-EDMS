/**
 * Smart EDMS — Retention NestJS module (spec §9.7).
 *
 * Wires the Retention controller + service + cron worker with its
 * dependencies:
 *  - PrismaService (global, from PrismaModule)
 *  - AuditService (global, from AuditModule)
 *  - ScheduleModule (already imported at the app level)
 *
 * Exports `RetentionService` so other modules (e.g. AI Assistant's
 * `retention.getUpcomingExpiry` tool) can use it directly.
 */

import { Module } from '@nestjs/common';
import { RetentionController } from './retention.controller';
import { RetentionService } from './retention.service';
import { RetentionCron } from './retention-cron';

@Module({
  controllers: [RetentionController],
  providers: [RetentionService, RetentionCron],
  exports: [RetentionService],
})
export class RetentionModule {}
