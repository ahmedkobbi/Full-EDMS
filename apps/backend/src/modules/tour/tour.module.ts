/**
 * Smart EDMS — Tour NestJS module (spec §10).
 *
 * Wires the Tour controller + service with its dependencies:
 *  - PrismaService (global, from PrismaModule)
 *  - AuditService (global, from AuditModule)
 *  - LicenseService (from LicenseModule) — for licensed-module filtering
 *
 * Exports `TourService` so other modules (e.g. AI Assistant's `tour.start`
 * tool) can look up tours programmatically.
 */

import { Module } from '@nestjs/common';
import { TourController, TourAdminController } from './tour.controller';
import { TourService } from './tour.service';
import { LicenseModule } from '../license/license.module';

@Module({
  imports: [LicenseModule],
  controllers: [TourController, TourAdminController],
  providers: [TourService],
  exports: [TourService],
})
export class TourModule {}
