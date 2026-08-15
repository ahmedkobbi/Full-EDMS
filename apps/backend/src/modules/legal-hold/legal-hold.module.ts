/**
 * Smart EDMS — Legal Hold NestJS module (spec §9.7).
 *
 * Wires the Legal Hold controller + service with its dependencies:
 *  - PrismaService (global, from PrismaModule)
 *  - AuditService (global, from AuditModule)
 *
 * Exports `LegalHoldService` so other modules (e.g. AI Assistant's
 * `legalHold.getStatus` tool, or a future document-deletion hook) can
 * query hold state programmatically.
 */

import { Module } from '@nestjs/common';
import { LegalHoldController } from './legal-hold.controller.js';
import { LegalHoldService } from './legal-hold.service.js';

@Module({
  controllers: [LegalHoldController],
  providers: [LegalHoldService],
  exports: [LegalHoldService],
})
export class LegalHoldModule {}
