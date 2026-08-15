import { Body, Controller, Get, Param, Post, Req, Query } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { Audit } from '../../common/decorators/audit.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { PhysicalTwinService } from './physical-twin.service';
import type { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard';

@Controller('v1/physical-twin')
export class PhysicalTwinController {
  constructor(private readonly twin: PhysicalTwinService) {}

  // ── NFC/RFID Physical-Digital Twin Sync ───────────────────────────────────

  @Roles('admin', 'records-manager')
  @Audit({ category: 'admin', code: 'physical_twin.tag' })
  @Post('tags')
  tagAsset(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.twin.tagAsset(req.user!.tid, req.user!.sub, body);
  }

  @Get('tags/:tagId')
  lookupTag(@Req() req: AuthenticatedRequest, @Param('tagId') tagId: string) {
    return this.twin.lookupTag(req.user!.tid, tagId);
  }

  @Get('tags')
  listTags(@Req() req: AuthenticatedRequest) {
    return this.twin.listTags(req.user!.tid);
  }

  // ── IoT Environmental Archival Logging ────────────────────────────────────

  /**
   * Log a sensor reading. Can be called by IoT devices with an API key
   * (no JWT required — uses X-Api-Key header).
   */
  @Post('sensors/log')
  async logSensorReading(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.twin.logSensorReading(req.user!.tid ?? req.apiKey?.tenantId ?? 'unknown', body);
  }

  @Get('sensors/:sensorId/readings')
  getSensorReadings(
    @Req() req: AuthenticatedRequest,
    @Param('sensorId') sensorId: string,
    @Query('limit') limit?: string,
  ) {
    return this.twin.getSensorReadings(req.user!.tid, sensorId, limit ? parseInt(limit, 10) : 100);
  }

  @Get('sensors')
  listSensors(@Req() req: AuthenticatedRequest) {
    return this.twin.listSensors(req.user!.tid);
  }
}
