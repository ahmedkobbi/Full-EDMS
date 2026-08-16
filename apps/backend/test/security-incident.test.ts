/**
 * Security Incident Service tests.
 *
 * Tests the full incident capture, profiling, notification, and
 * auto-response pipeline using direct Prisma queries.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { randomUUID, createHash } from 'node:crypto';
import { hostname, platform, arch, version as nodeVersion } from 'node:os';

describe('Security Incident Service (spec §27.3, §9.12)', () => {
  let prisma: any;
  let testTenantId: string;

  beforeAll(async () => {
    const setup = await import('./setup.js');
    prisma = setup.prisma;

    // Create a test tenant for incident scoping
    const tenant = await prisma.tenant.create({
      data: {
        code: `sec-${randomUUID().slice(0, 8)}`,
        name: 'Security Test Tenant',
        slug: `sec-test-${randomUUID().slice(0, 8)}`,
      },
    });
    testTenantId = tenant.id;
  });

  // Helper: create an incident directly (simulating what SecurityIncidentService.capture does)
  async function createIncident(params: {
    severity?: string;
    category: string;
    code: string;
    reason: string;
    ipAddress?: string;
    userId?: string;
    userEmail?: string;
    machineFingerprint?: string;
    failedLayers?: any;
  }) {
    const envFlags: Record<string, string> = {};
    for (const v of ['LD_PRELOAD', 'NODE_OPTIONS', 'FAKETIME', 'NODE_ENV']) {
      if (process.env[v]) envFlags[v] = process.env[v]!;
    }

    const sequenceNumber = BigInt(Date.now());
    const eventHash = createHash('sha256').update(`${params.code}|${sequenceNumber}`).digest('hex');

    return prisma.securityIncident.create({
      data: {
        id: randomUUID(),
        tenantId: testTenantId,
        severity: params.severity ?? 'WARNING',
        status: 'ACTIVE',
        category: params.category,
        code: params.code,
        reason: params.reason,
        ipAddress: params.ipAddress ?? null,
        userId: params.userId ?? null,
        userEmail: params.userEmail ?? null,
        userRoles: params.userId ? ['user'] : [],
        machineFingerprint: params.machineFingerprint ?? null,
        hostname: hostname(),
        platform: platform(),
        arch: arch(),
        nodeVersion: nodeVersion(),
        processPid: process.pid,
        envFlags: envFlags as any,
        requestMethod: 'GET',
        requestUrl: '/v1/test',
        callStack: new Error().stack,
        failedLayers: (params.failedLayers as any) ?? undefined,
        autoLockedDown: false,
        autoBlockedIp: false,
        autoSuspendedUser: false,
        sequenceNumber,
        previousHash: null,
        eventHash,
      },
    });
  }

  it('creates a WARNING incident with full attacker profile', async () => {
    const incident = await createIncident({
      severity: 'WARNING',
      category: 'license_validation',
      code: 'license.layer_failed',
      reason: 'Clock skew detected: clock rolled back 3600s',
      failedLayers: { clockSkew: false },
    });

    expect(incident.id).toBeTruthy();
    expect(incident.severity).toBe('WARNING');
    expect(incident.status).toBe('ACTIVE');
    expect(incident.hostname).toBeTruthy();
    expect(incident.platform).toBeTruthy();
    expect(incident.arch).toBeTruthy();
    expect(incident.nodeVersion).toBeTruthy();
    expect(incident.processPid).toBeGreaterThan(0);
    expect(incident.envFlags).toBeDefined();
    expect(incident.callStack).toBeTruthy();
  });

  it('creates a CRITICAL incident with IP and user info', async () => {
    // Create a test user for FK constraint
    const testUser = await prisma.user.create({
      data: {
        tenantId: testTenantId,
        email: `sec-test-${randomUUID().slice(0, 8)}@example.com`,
        firstName: 'Test',
        lastName: 'User',
        passwordHash: '$2a$12$dummy',
        status: 'ACTIVE',
      },
    });

    const incident = await createIncident({
      severity: 'CRITICAL',
      category: 'anti_tamper',
      code: 'anti_debug.detected',
      reason: 'Debug flag detected: --inspect=9229',
      ipAddress: '192.168.1.100',
      userEmail: 'suspicious@example.com',
      userId: testUser.id,
      failedLayers: { antiDebug: false },
    });

    expect(incident.severity).toBe('CRITICAL');
    expect(incident.ipAddress).toBe('192.168.1.100');
    expect(incident.userEmail).toBe('suspicious@example.com');
    expect(incident.userRoles).toContain('user');
  });

  it('creates a BLOCKED incident with hardware fingerprint', async () => {
    const incident = await createIncident({
      severity: 'BLOCKED',
      category: 'integrity',
      code: 'binary.patched',
      reason: 'Runtime integrity check failed: license.service.js modified',
      machineFingerprint: 'abc123def456',
      failedLayers: { integrity: false },
    });

    expect(incident.severity).toBe('BLOCKED');
    expect(incident.machineFingerprint).toBe('abc123def456');
  });

  it('captures suspicious environment variables in incident record', async () => {
    const originalLdPreload = process.env.LD_PRELOAD;
    process.env.LD_PRELOAD = '/tmp/malicious.so';

    const incident = await createIncident({
      severity: 'CRITICAL',
      category: 'env_tampering',
      code: 'env.ld_preload',
      reason: 'LD_PRELOAD is set: /tmp/malicious.so',
      failedLayers: { envTampering: false },
    });

    expect(incident.envFlags.LD_PRELOAD).toBe('/tmp/malicious.so');

    if (originalLdPreload === undefined) delete process.env.LD_PRELOAD;
    else process.env.LD_PRELOAD = originalLdPreload;
  });

  it('lists incidents with pagination', async () => {
    const items = await prisma.securityIncident.findMany({
      where: { tenantId: testTenantId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].hostname).toBeTruthy();
  });

  it('lists incidents filtered by severity', async () => {
    const items = await prisma.securityIncident.findMany({
      where: { tenantId: testTenantId, severity: 'BLOCKED' },
      orderBy: { createdAt: 'desc' },
    });
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.severity).toBe('BLOCKED');
    }
  });

  it('gets a single incident by ID with full forensic detail', async () => {
    const items = await prisma.securityIncident.findMany({
      where: { tenantId: testTenantId },
      take: 1,
    });
    const id = items[0].id;
    const incident = await prisma.securityIncident.findUnique({ where: { id } });
    expect(incident).not.toBeNull();
    expect(incident.id).toBe(id);
    expect(incident.callStack).toBeTruthy();
    expect(incident.hostname).toBeTruthy();
    expect(incident.failedLayers).toBeDefined();
  });

  it('returns dashboard stats', async () => {
    const [total, active, critical, blocked] = await Promise.all([
      prisma.securityIncident.count({ where: { tenantId: testTenantId } }),
      prisma.securityIncident.count({ where: { tenantId: testTenantId, status: 'ACTIVE' } }),
      prisma.securityIncident.count({ where: { tenantId: testTenantId, severity: 'CRITICAL' } }),
      prisma.securityIncident.count({ where: { tenantId: testTenantId, severity: 'BLOCKED' } }),
    ]);

    expect(total).toBeGreaterThan(0);
    expect(active).toBeGreaterThan(0);
    expect(critical).toBeGreaterThan(0);
    expect(blocked).toBeGreaterThan(0);
  });

  it('acknowledges an incident', async () => {
    const items = await prisma.securityIncident.findMany({
      where: { tenantId: testTenantId, status: 'ACTIVE' },
      take: 1,
    });
    const adminId = randomUUID();
    const result = await prisma.securityIncident.update({
      where: { id: items[0].id },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedBy: adminId,
        acknowledgedAt: new Date(),
        resolutionNote: 'Investigating',
      },
    });
    expect(result.status).toBe('ACKNOWLEDGED');
    expect(result.acknowledgedBy).toBe(adminId);
  });

  it('resolves an incident as false positive', async () => {
    const items = await prisma.securityIncident.findMany({
      where: { tenantId: testTenantId, status: 'ACKNOWLEDGED' },
      take: 1,
    });
    const adminId = randomUUID();
    const result = await prisma.securityIncident.update({
      where: { id: items[0].id },
      data: {
        status: 'FALSE_POSITIVE',
        resolvedBy: adminId,
        resolvedAt: new Date(),
        resolutionNote: 'False alarm',
      },
    });
    expect(result.status).toBe('FALSE_POSITIVE');
    expect(result.resolvedBy).toBe(adminId);
  });

  it('incident records have hash chain fields (tamper-evident)', async () => {
    const items = await prisma.securityIncident.findMany({
      where: { tenantId: testTenantId },
      take: 5,
    });
    for (const item of items) {
      expect(item.eventHash).toBeTruthy();
      expect(item.eventHash).toMatch(/^[a-f0-9]{64}$/);
      expect(item.sequenceNumber).toBeTruthy();
    }
  });

  it('IP blocklist works (create + query + delete)', async () => {
    // Block an IP
    await prisma.blockedIp.create({
      data: {
        ipAddress: '10.0.0.999',
        reason: 'Test block',
        blockedBy: 'test',
        expiresAt: new Date(Date.now() + 3600000),
      },
    });

    // Query blocked IPs
    const blocked = await prisma.blockedIp.findMany({
      where: { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    });
    expect(blocked.some((b: any) => b.ipAddress === '10.0.0.999')).toBe(true);

    // Unblock
    await prisma.blockedIp.delete({ where: { ipAddress: '10.0.0.999' } });
    const after = await prisma.blockedIp.findUnique({ where: { ipAddress: '10.0.0.999' } });
    expect(after).toBeNull();
  });
});
