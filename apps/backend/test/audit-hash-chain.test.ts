/**
 * Audit hash-chain integrity tests.
 *
 * Spec ref: §9.12 (audit, evidence, provenance), §24.2 (critical test cases —
 * audit hash chain verifies).
 *
 * These tests prove that:
 *   1. Audit events are written with sequential sequenceNumbers per tenant
 *   2. Each event's eventHash = sha256(previousHash | canonicalEvent)
 *   3. Tampering with any event breaks the chain
 *   4. The verifyHashChain method detects tampering
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { randomUUID } from 'node:crypto';

describe('Audit hash chain integrity (spec §9.12, §24.2)', () => {
  let prisma: any;
  let audit: any;
  let tenantId: string;

  beforeAll(async () => {
    const setup = await import('./setup.js');
    prisma = setup.prisma;
    audit = setup.audit;

    const tenant = await prisma.tenant.create({
      data: {
        code: `audit-${randomUUID().slice(0, 8)}`,
        name: 'Audit Test Tenant',
        slug: `audit-test-${randomUUID().slice(0, 8)}`,
      },
    });
    tenantId = tenant.id;
  });

  it('writes sequential audit events with hash chaining', async () => {
    // Write 3 events
    for (let i = 0; i < 3; i++) {
      await audit.record({
        tenantId,
        category: 'auth',
        code: 'auth.login',
        result: 'allow',
        reason: `test-event-${i}`,
      });
    }

    const events = await prisma.auditEvent.findMany({
      where: { tenantId },
      orderBy: { sequenceNumber: 'asc' },
    });

    expect(events.length).toBeGreaterThanOrEqual(3);

    // Verify sequence numbers are monotonic
    for (let i = 1; i < events.length; i++) {
      expect(events[i].sequenceNumber).toBeGreaterThan(events[i - 1].sequenceNumber);
    }

    // Verify each event has a non-null eventHash
    for (const ev of events) {
      expect(ev.eventHash).toBeTruthy();
      expect(ev.eventHash).toMatch(/^[a-f0-9]{64}$/);
    }

    // Verify the chain: each event's previousHash matches the prior event's eventHash
    for (let i = 1; i < events.length; i++) {
      expect(events[i].previousHash).toBe(events[i - 1].eventHash);
    }

    // The first event should have previousHash = null
    expect(events[0].previousHash).toBeNull();
  });

  it('verifyHashChain returns ok=true for an untampered chain', async () => {
    const result = await audit.verifyHashChain(tenantId);
    expect(result.ok).toBe(true);
  });

  it('detects tampering when an event is modified', async () => {
    // Take the second event and corrupt its reason
    const events = await prisma.auditEvent.findMany({
      where: { tenantId },
      orderBy: { sequenceNumber: 'asc' },
    });
    expect(events.length).toBeGreaterThanOrEqual(2);

    const target = events[1];
    await prisma.auditEvent.update({
      where: { id: target.id },
      data: { reason: 'TAMPERED' },
    });

    const result = await audit.verifyHashChain(tenantId);
    expect(result.ok).toBe(false);
    expect(result.brokenAt).toBe(target.sequenceNumber);

    // Restore for subsequent tests
    await prisma.auditEvent.update({
      where: { id: target.id },
      data: { reason: target.reason },
    });
  });

  it('detects tampering when an eventHash is corrupted', async () => {
    const events = await prisma.auditEvent.findMany({
      where: { tenantId },
      orderBy: { sequenceNumber: 'asc' },
    });
    const target = events[events.length - 1];

    await prisma.auditEvent.update({
      where: { id: target.id },
      data: { eventHash: '0'.repeat(64) },
    });

    const result = await audit.verifyHashChain(tenantId);
    expect(result.ok).toBe(false);

    // Restore
    await prisma.auditEvent.update({
      where: { id: target.id },
      data: { eventHash: target.eventHash },
    });
  });

  it('different tenants have independent hash chains', async () => {
    // Create a second tenant and write an event
    const tenant2 = await prisma.tenant.create({
      data: {
        code: `audit2-${randomUUID().slice(0, 8)}`,
        name: 'Audit Test Tenant 2',
        slug: `audit-test2-${randomUUID().slice(0, 8)}`,
      },
    });

    await audit.record({
      tenantId: tenant2.id,
      category: 'auth',
      code: 'auth.login',
      result: 'allow',
    });

    const tenant1Events = await prisma.auditEvent.findMany({
      where: { tenantId },
      orderBy: { sequenceNumber: 'asc' },
    });
    const tenant2Events = await prisma.auditEvent.findMany({
      where: { tenantId: tenant2.id },
      orderBy: { sequenceNumber: 'asc' },
    });

    // Tenant 2's first event should have previousHash = null (independent chain)
    expect(tenant2Events[0].previousHash).toBeNull();

    // Tenant 2's events should not reference tenant 1's hashes
    const tenant1Hashes = new Set(tenant1Events.map((e) => e.eventHash));
    for (const ev of tenant2Events) {
      if (ev.previousHash) {
        expect(tenant1Hashes.has(ev.previousHash)).toBe(false);
      }
    }
  });
});
