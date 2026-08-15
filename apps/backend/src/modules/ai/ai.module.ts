/**
 * Smart EDMS — AI Assistant NestJS module (spec §11, §15.3).
 *
 * Wires the AI controller + service with its dependencies:
 *  - PrismaService (global, from PrismaModule)
 *  - AuditService (global, from AuditModule)
 *  - RedisService (global, from RedisModule)
 *  - SearchService (from SearchModule) — used by `documents.search`
 *  - LicenseService (from LicenseModule) — used by `license.getStatus`
 *
 * Exports `AiService` so other modules (e.g. a future WebSocket gateway) can
 * dispatch tool calls programmatically. The tool catalogue is imported as a
 * plain TS module (no DI) — it is a static registry.
 *
 * Spec ref: §11 (AI Assistant Bubble), §15.3 (module wiring), §27.7 (rules).
 */

import { Module } from '@nestjs/common';
import { AiController, AiAdminController } from './ai.controller';
import { AiService } from './ai.service';
import { SearchModule } from '../search/search.module';
import { LicenseModule } from '../license/license.module';

@Module({
  imports: [SearchModule, LicenseModule],
  controllers: [AiController, AiAdminController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
