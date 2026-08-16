/**
 * Smart EDMS — Security Incident Controller.
 *
 * Admin panel REST API for viewing and managing security incidents.
 * All endpoints require admin role.
 *
 * Spec ref: §27.3 (security rules), §9.12 (audit, evidence).
 */

import {
  Body, Controller, ForbiddenException, Get, Param, Patch, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { SecurityIncidentService } from './security-incident.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard';
import type { IncidentSeverity, IncidentStatus } from './security-incident.service';

@Controller('v1/security')
@Roles('admin')
export class SecurityIncidentController {
  constructor(private readonly security: SecurityIncidentService) {}

  // ── Dashboard ──

  @Get('dashboard')
  async getDashboard(@Req() req: AuthenticatedRequest) {
    return this.security.getDashboardStats(req.user!.tid);
  }

  // ── Incidents ──

  @Get('incidents')
  async listIncidents(
    @Req() req: AuthenticatedRequest,
    @Query('severity') severity?: string,
    @Query('status') status?: string,
    @Query('ipAddress') ipAddress?: string,
    @Query('userId') userId?: string,
    @Query('category') category?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.security.listIncidents({
      tenantId: req.user!.tid,
      severity: severity as IncidentSeverity,
      status: status as IncidentStatus,
      ipAddress,
      userId,
      category,
      limit: limit ? parseInt(limit, 10) : 50,
      cursor,
    });
  }

  @Get('incidents/:id')
  async getIncident(@Param('id') id: string) {
    const incident = await this.security.getIncident(id);
    if (!incident) {
      throw new ForbiddenException({ messageKey: 'errors.NOT_FOUND' });
    }
    return incident;
  }

  @Patch('incidents/:id/acknowledge')
  async acknowledge(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() body: { note?: string },
  ) {
    return this.security.acknowledge(id, req.user!.sub, body.note);
  }

  @Patch('incidents/:id/resolve')
  async resolve(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() body: { note?: string; falsePositive?: boolean },
  ) {
    return this.security.resolve(id, req.user!.sub, body.note, body.falsePositive);
  }

  // ── IP Blocklist ──

  @Get('blocked-ips')
  async listBlockedIps() {
    return this.security.listBlockedIps();
  }

  @Post('blocked-ips')
  async blockIp(
    @Body() body: { ipAddress: string; reason: string; durationHours?: number },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.security.blockIpManual(
      body.ipAddress,
      body.reason,
      req.user!.sub,
      body.durationHours ?? 24,
    );
  }

  @Post('blocked-ips/:ip/unblock')
  async unblockIp(@Param('ip') ip: string) {
    await this.security.unblockIp(ip);
    return { ok: true };
  }
}
