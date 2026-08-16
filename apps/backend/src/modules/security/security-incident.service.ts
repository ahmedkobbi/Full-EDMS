import { Prisma } from '@prisma/client';
/**
 * Smart EDMS — Security Incident Service.
 *
 * Enterprise-grade security incident capture, profiling, notification,
 * and auto-response system. When any cracking/tampering attempt is
 * detected, this service:
 *
 *  1. Captures full forensic evidence (attacker profile, hardware,
 *     network, environment, request context)
 *  2. Stores it in a tamper-evident hash-chained log
 *  3. Sends real-time WebSocket notification to admin panel
 *  4. Triggers auto-lockdown (block IP, suspend account) based on
 *     severity thresholds
 *
 * Spec ref: §9.12 (audit, evidence), §27.3 (security rules),
 *           §12.4 (licensing enforcement).
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis.service';
import { EmailService } from '../email/email.service';
import { createHash, randomUUID } from 'node:crypto';
import { arch, hostname, version as nodeVersion, platform } from 'node:os';

// ── Types ──────────────────────────────────────────────────────────

export type IncidentSeverity = 'INFO' | 'WARNING' | 'CRITICAL' | 'BLOCKED';
export type IncidentStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'FALSE_POSITIVE';

export interface AttackerProfile {
  // Network
  ipAddress: string | null;
  userAgent: string | null;
  forwardedFor: string | null;
  // Account (if authenticated)
  userId: string | null;
  userEmail: string | null;
  userRoles: string[];
  // Hardware / Environment
  machineFingerprint: string | null;
  deploymentId: string | null;
  hostname: string;
  platform: string;
  arch: string;
  nodeVersion: string;
  processPid: number;
  // Suspicious env vars
  envFlags: Record<string, string>;
}

export interface IncidentInput {
  tenantId?: string;
  severity: IncidentSeverity;
  category: string;
  code: string;
  reason: string;
  // Request context
  ipAddress?: string;
  userAgent?: string;
  forwardedFor?: string;
  userId?: string;
  userEmail?: string;
  userRoles?: string[];
  requestMethod?: string;
  requestUrl?: string;
  requestHeaders?: Record<string, unknown>;
  requestBody?: string;
  // Validation results
  failedLayers?: Record<string, boolean>;
  // Machine fingerprint
  machineFingerprint?: string;
  deploymentId?: string;
  correlationId?: string;
}

export interface IncidentRecord {
  id: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  category: string;
  code: string;
  reason: string;
  attacker: AttackerProfile;
  failedLayers: Record<string, boolean> | null;
  autoLockedDown: boolean;
  autoBlockedIp: boolean;
  autoSuspendedUser: boolean;
  createdAt: string;
}

// ── Auto-lockdown thresholds ───────────────────────────────────────

const LOCKDOWN_THRESHOLDS = {
  IP_BLOCK_THRESHOLD: 3,
  IP_BLOCK_WINDOW_SECONDS: 3600,
  USER_SUSPEND_THRESHOLD: 2,
  DEPLOYMENT_LOCKDOWN_THRESHOLD: 5,
};

// ── Service ────────────────────────────────────────────────────────

@Injectable()
export class SecurityIncidentService {
  private readonly logger = new Logger(SecurityIncidentService.name);
  private readonly lastHashByTenant = new Map<string, string>();
  private readonly lastSequenceByTenant = new Map<bigint, bigint>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly emailService: EmailService,
  ) {
    void this.loadLastHashes();
  }

  private async loadLastHashes(): Promise<void> {
    try {
      const incidents = await this.prisma.securityIncident.findMany({
        orderBy: { sequenceNumber: 'desc' },
        take: 100,
      });
      for (const inc of incidents) {
        if (inc.tenantId && !this.lastHashByTenant.has(inc.tenantId)) {
          this.lastHashByTenant.set(inc.tenantId, inc.eventHash);
        }
      }
    } catch (err) {
      this.logger.warn(`Failed to load last incident hashes: ${(err as Error).message}`);
    }
  }

  /**
   * Capture a security incident with full forensic profiling.
   */
  async capture(input: IncidentInput): Promise<IncidentRecord> {
    try {
      const attacker = this.buildAttackerProfile(input);

      const tenantKey = input.tenantId ?? 'system';
      const previousHash = this.lastHashByTenant.get(tenantKey) ?? null;
      const sequenceNumber = BigInt(Date.now());
      const occurredAt = new Date().toISOString();

      const canonical = this.canonicalizeIncident({
        tenantId: tenantKey,
        severity: input.severity,
        category: input.category,
        code: input.code,
        reason: input.reason,
        ipAddress: attacker.ipAddress,
        userId: attacker.userId,
        machineFingerprint: attacker.machineFingerprint,
        sequenceNumber: sequenceNumber.toString(),
        previousHash,
        occurredAt,
      });
      const eventHash = createHash('sha256').update(canonical).digest('hex');

      const autoResponse = await this.evaluateAutoResponse(input, attacker);

      const incident = await this.prisma.securityIncident.create({
        data: {
          id: randomUUID(),
          tenantId: input.tenantId ?? null,
          severity: input.severity,
          status: 'ACTIVE',
          category: input.category,
          code: input.code,
          reason: input.reason,
          ipAddress: attacker.ipAddress,
          userAgent: attacker.userAgent,
          forwardedFor: attacker.forwardedFor,
          userId: attacker.userId,
          userEmail: attacker.userEmail,
          userRoles: attacker.userRoles,
          machineFingerprint: attacker.machineFingerprint,
          deploymentId: attacker.deploymentId,
          hostname: attacker.hostname,
          platform: attacker.platform,
          arch: attacker.arch,
          nodeVersion: attacker.nodeVersion,
          processPid: attacker.processPid,
          envFlags: attacker.envFlags as Prisma.InputJsonValue,
          requestMethod: input.requestMethod ?? null,
          requestUrl: input.requestUrl ?? null,
          requestHeaders: (input.requestHeaders as Prisma.InputJsonValue) ?? undefined,
          requestBody: input.requestBody ?? null,
          callStack: this.captureCallStack(),
          failedLayers: (input.failedLayers as Prisma.InputJsonValue) ?? undefined,
          autoLockedDown: autoResponse.lockedDown,
          autoBlockedIp: autoResponse.blockedIp,
          autoSuspendedUser: autoResponse.suspendedUser,
          sequenceNumber,
          previousHash,
          eventHash,
          correlationId: input.correlationId ?? null,
        },
      });

      this.lastHashByTenant.set(tenantKey, eventHash);

      if (autoResponse.blockedIp && attacker.ipAddress) {
        await this.blockIp(attacker.ipAddress, input.reason, incident.id);
      }
      if (autoResponse.suspendedUser && attacker.userId) {
        await this.suspendUser(attacker.userId, input.reason);
      }
      if (autoResponse.lockedDown) {
        await this.triggerLockdown(input.tenantId, input.reason);
      }

      await this.notifyAdmins({
        id: incident.id,
        severity: input.severity,
        status: 'ACTIVE',
        category: input.category,
        code: input.code,
        reason: input.reason,
        attacker,
        failedLayers: input.failedLayers ?? null,
        autoLockedDown: autoResponse.lockedDown,
        autoBlockedIp: autoResponse.blockedIp,
        autoSuspendedUser: autoResponse.suspendedUser,
        createdAt: incident.createdAt.toISOString(),
      });

      this.logger.warn(
        `Security incident captured: [${input.severity}] ${input.category}/${input.code} — ${input.reason}`,
      );

      return {
        id: incident.id,
        severity: input.severity,
        status: 'ACTIVE',
        category: input.category,
        code: input.code,
        reason: input.reason,
        attacker,
        failedLayers: input.failedLayers ?? null,
        autoLockedDown: autoResponse.lockedDown,
        autoBlockedIp: autoResponse.blockedIp,
        autoSuspendedUser: autoResponse.suspendedUser,
        createdAt: incident.createdAt.toISOString(),
      };
    } catch (err) {
      this.logger.error(`Failed to capture security incident: ${(err as Error).message}`);
      return {
        id: 'capture-failed',
        severity: input.severity,
        status: 'ACTIVE',
        category: input.category,
        code: input.code,
        reason: input.reason,
        attacker: this.buildAttackerProfile(input),
        failedLayers: input.failedLayers ?? null,
        autoLockedDown: false,
        autoBlockedIp: false,
        autoSuspendedUser: false,
        createdAt: new Date().toISOString(),
      };
    }
  }

  private buildAttackerProfile(input: IncidentInput): AttackerProfile {
    const envFlags: Record<string, string> = {};
    const suspiciousEnvVars = [
      'LD_PRELOAD', 'LD_LIBRARY_PATH', 'DYLD_INSERT_LIBRARIES',
      'NODE_PATH', 'NODE_OPTIONS', 'FAKETIME', 'LIBFAKETIME',
      'NODE_ENV', 'LICENSE_PUBLIC_KEY_PATH', 'LICENSE_PUBLIC_KEY_HASH',
    ];
    for (const varName of suspiciousEnvVars) {
      const value = process.env[varName];
      if (value) {
        envFlags[varName] = value;
      }
    }

    return {
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      forwardedFor: input.forwardedFor ?? null,
      userId: input.userId ?? null,
      userEmail: input.userEmail ?? null,
      userRoles: input.userRoles ?? [],
      machineFingerprint: input.machineFingerprint ?? null,
      deploymentId: input.deploymentId ?? null,
      hostname: hostname(),
      platform: platform(),
      arch: arch(),
      nodeVersion: nodeVersion(),
      processPid: process.pid,
      envFlags,
    };
  }

  private captureCallStack(): string {
    try {
      const stack = new Error().stack ?? '';
      return stack.split('\n').slice(0, 20).join('\n');
    } catch {
      return '';
    }
  }

  private async evaluateAutoResponse(
    input: IncidentInput,
    attacker: AttackerProfile,
  ): Promise<{ blockedIp: boolean; suspendedUser: boolean; lockedDown: boolean }> {
    if (input.severity !== 'CRITICAL' && input.severity !== 'BLOCKED') {
      return { blockedIp: false, suspendedUser: false, lockedDown: false };
    }

    let blockedIp = false;
    let suspendedUser = false;
    let lockedDown = false;

    if (attacker.ipAddress) {
      const ipKey = `sec:ip:${attacker.ipAddress}:count`;
      const count = await this.redis.connection.incr(ipKey);
      if (count === 1) {
        await this.redis.connection.expire(ipKey, LOCKDOWN_THRESHOLDS.IP_BLOCK_WINDOW_SECONDS);
      }
      if (count >= LOCKDOWN_THRESHOLDS.IP_BLOCK_THRESHOLD) {
        blockedIp = true;
      }
    }

    if (attacker.userId) {
      const userKey = `sec:user:${attacker.userId}:count`;
      const count = await this.redis.connection.incr(userKey);
      if (count === 1) {
        await this.redis.connection.expire(userKey, LOCKDOWN_THRESHOLDS.IP_BLOCK_WINDOW_SECONDS);
      }
      if (count >= LOCKDOWN_THRESHOLDS.USER_SUSPEND_THRESHOLD) {
        suspendedUser = true;
      }
    }

    if (input.tenantId) {
      const deployKey = `sec:deploy:${input.tenantId}:count`;
      const count = await this.redis.connection.incr(deployKey);
      if (count === 1) {
        await this.redis.connection.expire(deployKey, LOCKDOWN_THRESHOLDS.IP_BLOCK_WINDOW_SECONDS);
      }
      if (count >= LOCKDOWN_THRESHOLDS.DEPLOYMENT_LOCKDOWN_THRESHOLD) {
        lockedDown = true;
      }
    }

    if (input.severity === 'BLOCKED' && attacker.ipAddress) {
      blockedIp = true;
    }

    return { blockedIp, suspendedUser, lockedDown };
  }

  private async blockIp(ip: string, reason: string, incidentId: string): Promise<void> {
    try {
      await this.prisma.blockedIp.upsert({
        where: { ipAddress: ip },
        create: {
          ipAddress: ip,
          reason,
          incidentId,
          blockedBy: 'auto-incident-response',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
        update: {
          reason,
          incidentId,
          attemptCount: { increment: 1 },
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
      this.logger.warn(`IP blocked: ${ip} (reason: ${reason})`);
    } catch (err) {
      this.logger.error(`Failed to block IP ${ip}: ${(err as Error).message}`);
    }
  }

  private async suspendUser(userId: string, reason: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          status: 'SUSPENDED',
          lockedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
      this.logger.warn(`User suspended: ${userId} (reason: ${reason})`);
    } catch (err) {
      this.logger.error(`Failed to suspend user ${userId}: ${(err as Error).message}`);
    }
  }

  private async triggerLockdown(tenantId: string | undefined, reason: string): Promise<void> {
    try {
      if (tenantId) {
        await this.prisma.licenseLocalState.updateMany({
          where: { tenantId },
          data: { state: 'invalid' },
        });
      }
      await this.redis.connection.set(
        `sec:lockdown:${tenantId ?? 'system'}`,
        JSON.stringify({ reason, timestamp: new Date().toISOString() }),
        'EX',
        3600,
      );
      this.logger.error(`DEPLOYMENT LOCKDOWN TRIGGERED: ${reason}`);
    } catch (err) {
      this.logger.error(`Failed to trigger lockdown: ${(err as Error).message}`);
    }
  }

  private async notifyAdmins(incident: IncidentRecord): Promise<void> {
    // 1. Real-time WebSocket notification to admin panel
    try {
      await this.redis.connection.publish(
        'smart-edms:ws-events:admin',
        JSON.stringify({
          name: 'security.incident.created',
          payload: {
            id: incident.id,
            severity: incident.severity,
            category: incident.category,
            code: incident.code,
            reason: incident.reason,
            attacker: {
              ipAddress: incident.attacker.ipAddress,
              userEmail: incident.attacker.userEmail,
              hostname: incident.attacker.hostname,
              platform: incident.attacker.platform,
              machineFingerprint: incident.attacker.machineFingerprint,
            },
            autoLockedDown: incident.autoLockedDown,
            autoBlockedIp: incident.autoBlockedIp,
            autoSuspendedUser: incident.autoSuspendedUser,
            createdAt: incident.createdAt,
          },
        }),
      );
    } catch (err) {
      this.logger.error(`Failed to notify admins via WebSocket: ${(err as Error).message}`);
    }

    // 2. Email alert for CRITICAL and BLOCKED incidents (spec §9.13)
    if (incident.severity === 'CRITICAL' || incident.severity === 'BLOCKED') {
      try {
        await this.sendSecurityAlertEmail(incident);
      } catch (err) {
        this.logger.error(`Failed to send security alert email: ${(err as Error).message}`);
      }
    }
  }

  /**
   * Send a security alert email to deployment admins.
   * Queries the DB for users with admin role in the affected tenant.
   */
  private async sendSecurityAlertEmail(incident: IncidentRecord): Promise<void> {
    // Find admin users to notify (from the affected tenant, or all admins if no tenant)
    const where: any = {
      status: 'ACTIVE',
      deletedAt: null,
      roleAssignments: { some: { role: { code: 'admin' } } },
    };
    if (incident.attacker.userId) {
      // Also include the affected user's email if they have one
    }

    const admins = await this.prisma.user.findMany({
      where,
      select: { email: true, preferredLocale: true },
      take: 50, // Safety limit
    });

    if (admins.length === 0) {
      this.logger.warn('No admin users found to send security alert email');
      return;
    }

    const severityLabel = incident.severity === 'BLOCKED' ? '🚫 BLOCKED' : '⚠️ CRITICAL';
    const subject = `[Smart EDMS Security] ${severityLabel}: ${incident.category}/${incident.code}`;

    const emailVars = {
      incidentId: incident.id,
      severity: incident.severity,
      category: incident.category,
      code: incident.code,
      reason: incident.reason,
      attackerIp: incident.attacker.ipAddress ?? 'unknown',
      attackerEmail: incident.attacker.userEmail ?? 'N/A',
      attackerHostname: incident.attacker.hostname,
      attackerPlatform: `${incident.attacker.platform}/${incident.attacker.arch}`,
      attackerFingerprint: incident.attacker.machineFingerprint ?? 'N/A',
      autoBlockedIp: incident.autoBlockedIp ? 'YES' : 'NO',
      autoSuspendedUser: incident.autoSuspendedUser ? 'YES' : 'NO',
      autoLockedDown: incident.autoLockedDown ? 'YES' : 'NO',
      createdAt: incident.createdAt,
      suspiciousEnvVars: incident.attacker.envFlags
        ? Object.entries(incident.attacker.envFlags).map(([k, v]) => `${k}=${v}`).join(', ')
        : 'None',
    };

    // Send email to each admin (queued via BullMQ/Redis)
    for (const admin of admins) {
      try {
        await this.emailService.sendEmail({
          to: admin.email,
          template: 'security-incident-alert',
          vars: emailVars,
          locale: admin.preferredLocale ?? 'en',
          subject,
        });
      } catch (err) {
        this.logger.error(`Failed to queue email to ${admin.email}: ${(err as Error).message}`);
      }
    }

    this.logger.log(`Security alert email queued for ${admins.length} admin(s)`);
  }

  private canonicalizeIncident(data: Record<string, unknown>): string {
    const keys = Object.keys(data).sort();
    const parts = keys.map((k) => `${k}=${data[k] === null ? 'null' : String(data[k])}`);
    return parts.join('|');
  }

  // ── Query methods for admin panel ─────────────────────────────────

  async listIncidents(params: {
    tenantId?: string;
    severity?: IncidentSeverity;
    status?: IncidentStatus;
    ipAddress?: string;
    userId?: string;
    category?: string;
    limit?: number;
    cursor?: string;
  }) {
    const where: any = {};
    if (params.tenantId) {where.tenantId = params.tenantId;}
    if (params.severity) {where.severity = params.severity;}
    if (params.status) {where.status = params.status;}
    if (params.ipAddress) {where.ipAddress = params.ipAddress;}
    if (params.userId) {where.userId = params.userId;}
    if (params.category) {where.category = { contains: params.category };}

    const take = Math.min(params.limit ?? 50, 200);

    const [items, total] = await Promise.all([
      this.prisma.securityIncident.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: take + 1,
        ...(params.cursor ? { skip: 1, cursor: { id: params.cursor } } : {}),
      }),
      this.prisma.securityIncident.count({ where }),
    ]);

    const hasMore = items.length > take;
    const trimmed = hasMore ? items.slice(0, take) : items;

    return {
      items: trimmed.map((i) => ({
        ...i,
        sequenceNumber: i.sequenceNumber.toString(),
      })),
      total,
      hasMore,
      nextCursor: hasMore ? trimmed[trimmed.length - 1]?.id : null,
    };
  }

  async getIncident(id: string) {
    const incident = await this.prisma.securityIncident.findUnique({ where: { id } });
    if (!incident) {return null;}
    return {
      ...incident,
      sequenceNumber: incident.sequenceNumber.toString(),
    };
  }

  async acknowledge(id: string, adminUserId: string, note?: string) {
    return this.prisma.securityIncident.update({
      where: { id },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedBy: adminUserId,
        acknowledgedAt: new Date(),
        resolutionNote: note,
      },
    });
  }

  async resolve(id: string, adminUserId: string, note?: string, falsePositive = false) {
    return this.prisma.securityIncident.update({
      where: { id },
      data: {
        status: falsePositive ? 'FALSE_POSITIVE' : 'RESOLVED',
        resolvedBy: adminUserId,
        resolvedAt: new Date(),
        resolutionNote: note,
      },
    });
  }

  async getDashboardStats(tenantId?: string) {
    const where = tenantId ? { tenantId } : {};
    const [total, active, critical, blocked, todayCount, blockedIps] = await Promise.all([
      this.prisma.securityIncident.count({ where }),
      this.prisma.securityIncident.count({ where: { ...where, status: 'ACTIVE' } }),
      this.prisma.securityIncident.count({ where: { ...where, severity: 'CRITICAL' } }),
      this.prisma.securityIncident.count({ where: { ...where, severity: 'BLOCKED' } }),
      this.prisma.securityIncident.count({
        where: { ...where, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
      this.prisma.blockedIp.count({
        where: { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      }),
    ]);

    return {
      totalIncidents: total,
      activeIncidents: active,
      criticalIncidents: critical,
      blockedIncidents: blocked,
      incidentsToday: todayCount,
      blockedIpsActive: blockedIps,
    };
  }

  async isIpBlocked(ip: string): Promise<boolean> {
    const blocked = await this.prisma.blockedIp.findUnique({ where: { ipAddress: ip } });
    if (!blocked) {return false;}
    if (blocked.expiresAt && blocked.expiresAt < new Date()) {return false;}
    return true;
  }

  async blockIpManual(ip: string, reason: string, adminId: string, durationHours = 24) {
    return this.prisma.blockedIp.upsert({
      where: { ipAddress: ip },
      create: {
        ipAddress: ip,
        reason,
        blockedBy: adminId,
        expiresAt: new Date(Date.now() + durationHours * 60 * 60 * 1000),
      },
      update: {
        reason,
        blockedBy: adminId,
        expiresAt: new Date(Date.now() + durationHours * 60 * 60 * 1000),
        attemptCount: { increment: 1 },
      },
    });
  }

  async unblockIp(ip: string) {
    return this.prisma.blockedIp.delete({ where: { ipAddress: ip } });
  }

  async listBlockedIps() {
    return this.prisma.blockedIp.findMany({
      where: { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      orderBy: { blockedAt: 'desc' },
    });
  }
}
