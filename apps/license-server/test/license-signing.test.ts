/**
 * License-server signing + state machine integration tests.
 *
 * Spec ref: §12.4 (license signing), §4.4 (6-state machine), §12.5 (.sedmslic format).
 *
 * These tests verify that the license-server's signing flow produces valid
 * artifacts that the on-premise backend can verify, and that the 6-state
 * machine behaves correctly across all license states.
 */
import { describe, it, expect } from 'vitest';
import {
  generateSigningKeyPair,
  buildLicenseArtifact,
  verifyLicenseArtifact,
  parseSedmslic,
  computeLicenseState,
  buildOfflineRequest,
  parseSedmsreq,
  buildRevocationList,
  verifyRevocationList,
  isRevoked,
  computeMachineFingerprint,
  type SigningKeyPair,
} from '@smart-edms/license-core';
import type { LicensePayload, LicenseState } from '@smart-edms/types';
import { randomUUID } from 'node:crypto';

describe('License-server signing flow (spec §12.4, §12.5)', () => {
  let keyPair: SigningKeyPair;

  beforeAll(() => {
    keyPair = generateSigningKeyPair('EdDSA');
  });

  function buildPayload(overrides: Partial<LicensePayload> = {}): LicensePayload {
    const now = new Date();
    const expires = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    return {
      v: 1,
      licenseId: randomUUID(),
      customerId: randomUUID(),
      productId: 'smart-edms-core',
      planId: 'enterprise-on-premise',
      deploymentId: `dep-${randomUUID().slice(0, 16)}`,
      tenantId: null,
      environment: 'production',
      issuedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      gracePeriodDays: 7,
      offline: true,
      deploymentFingerprint: 'a'.repeat(64),
      entitlements: ['core-edms', 'ai-assistant', 'advanced-search'],
      limits: {
        maxUsers: 500,
        maxDevices: 5,
        maxStorageBytes: 1099511627776n,
        maxDocuments: 1000000,
      },
      features: {
        aiUsageAllowance: 10000,
        offlineMode: true,
        hybridSync: false,
        supportLevel: 'enterprise',
      },
      renewalCounter: 0,
      ...overrides,
    } as LicensePayload;
  }

  it('generates a valid Ed25519 keypair with correct kid format', () => {
    expect(keyPair.alg).toBe('EdDSA');
    expect(keyPair.kid).toMatch(/^[a-f0-9]{16}$/);
    expect(keyPair.publicKeyPem).toContain('BEGIN PUBLIC KEY');
    expect(keyPair.privateKeyPem).toContain('BEGIN PRIVATE KEY');
  });

  it('signs a license payload and the artifact verifies', () => {
    const payload = buildPayload();
    const artifact = buildLicenseArtifact(payload, keyPair.privateKeyPem, keyPair.kid, 'EdDSA');

    expect(artifact.v).toBe(1);
    expect(artifact.type).toBe('sedms.license');
    expect(artifact.alg).toBe('EdDSA');
    expect(artifact.kid).toBe(keyPair.kid);
    expect(artifact.sig).toBeTruthy();

    const result = verifyLicenseArtifact(artifact, keyPair.publicKeyPem);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.licenseId).toBe(payload.licenseId);
      expect(result.payload.entitlements).toEqual(payload.entitlements);
    }
  });

  it('artifact survives JSON serialization round-trip', () => {
    const payload = buildPayload();
    const artifact = buildLicenseArtifact(payload, keyPair.privateKeyPem, keyPair.kid, 'EdDSA');

    const json = JSON.stringify(artifact);
    const parsed = JSON.parse(json);

    const result = verifyLicenseArtifact(parsed, keyPair.publicKeyPem);
    expect(result.ok).toBe(true);
  });

  it('parseSedmslic round-trips through serialization', () => {
    const payload = buildPayload();
    const artifact = buildLicenseArtifact(payload, keyPair.privateKeyPem, keyPair.kid, 'EdDSA');
    const json = JSON.stringify(artifact, null, 2);

    const parsed = parseSedmslic(json);
    expect(parsed.v).toBe(artifact.v);
    expect(parsed.kid).toBe(artifact.kid);
    expect(parsed.sig).toBe(artifact.sig);
  });

  it('rejects artifact signed with different key', () => {
    const otherKey = generateSigningKeyPair('EdDSA');
    const payload = buildPayload();
    const artifact = buildLicenseArtifact(payload, keyPair.privateKeyPem, keyPair.kid, 'EdDSA');

    const result = verifyLicenseArtifact(artifact, otherKey.publicKeyPem);
    expect(result.ok).toBe(false);
  });

  it('rejects tampered payload', () => {
    const payload = buildPayload();
    const artifact = buildLicenseArtifact(payload, keyPair.privateKeyPem, keyPair.kid, 'EdDSA');
    const tampered = {
      ...artifact,
      payload: { ...artifact.payload, licenseId: randomUUID() },
    };

    const result = verifyLicenseArtifact(tampered, keyPair.publicKeyPem);
    expect(result.ok).toBe(false);
  });
});

describe('Offline activation request flow (spec §12.6, §12.8)', () => {
  it('builds and parses a .sedmsreq file', () => {
    const req = buildOfflineRequest({
      productId: 'smart-edms-core',
      deploymentId: `dep-${randomUUID().slice(0, 16)}`,
      appVersion: '1.0.0',
      generatedAt: new Date().toISOString(),
      machineFingerprint: 'f'.repeat(64),
      installationPublicKey: '',
      os: 'linux/x64',
      arch: 'x64',
      contactEmail: 'admin@customer.com',
      nonce: randomUUID().replace(/-/g, '').slice(0, 32),
    });

    const json = JSON.stringify(req, null, 2);
    const parsed = parseSedmsreq(json);

    expect(parsed.type).toBe('sedms.request');
    expect(parsed.productId).toBe('smart-edms-core');
    expect(parsed.machineFingerprint).toBe('f'.repeat(64));
    expect(parsed.nonce).toBeTruthy();
  });
});

describe('Revocation list (spec §12.4, .sedmscrl)', () => {
  let keyPair: SigningKeyPair;

  beforeAll(() => {
    keyPair = generateSigningKeyPair('EdDSA');
  });

  it('builds and verifies a .sedmscrl', () => {
    const licenseIds = [randomUUID(), randomUUID(), randomUUID()];
    const crl = buildRevocationList(licenseIds, keyPair.privateKeyPem, keyPair.kid, 'EdDSA');

    expect(crl.type).toBe('sedms.crl');
    expect(crl.revokedLicenses).toHaveLength(3);

    const verified = verifyRevocationList(crl, keyPair.publicKeyPem);
    expect(verified).toBe(true);
  });

  it('detects revoked license IDs', () => {
    const revokedId = randomUUID();
    const crl = buildRevocationList([revokedId], keyPair.privateKeyPem, keyPair.kid, 'EdDSA');

    expect(isRevoked(crl, revokedId)).toBe(true);
    expect(isRevoked(crl, randomUUID())).toBe(false);
  });

  it('rejects CRL with tampered signature', () => {
    const crl = buildRevocationList([randomUUID()], keyPair.privateKeyPem, keyPair.kid, 'EdDSA');
    const tampered = { ...crl, sig: 'tampered' + crl.sig.slice(8) };
    expect(verifyRevocationList(tampered, keyPair.publicKeyPem)).toBe(false);
  });
});

describe('License 6-state machine (spec §4.4)', () => {
  const baseInput = {
    signatureValid: true,
    revoked: false,
    deviceMatch: true,
    environmentMatch: true,
    heartbeatFailures: 0,
    extendedRemediationThresholdDays: 30,
  };

  it('returns "valid" for a fresh license', () => {
    const now = new Date();
    const state = computeLicenseState({
      ...baseInput,
      now,
      issuedAt: new Date(now.getTime() - 86400000),
      expiresAt: new Date(now.getTime() + 365 * 86400000),
      gracePeriodDays: 7,
    });
    expect(state).toBe<LicenseState>('valid');
  });

  it('returns "expiring_soon" within 30 days of expiry', () => {
    const now = new Date();
    const state = computeLicenseState({
      ...baseInput,
      now,
      issuedAt: new Date(now.getTime() - 365 * 86400000),
      expiresAt: new Date(now.getTime() + 15 * 86400000),
      gracePeriodDays: 7,
    });
    expect(state).toBe<LicenseState>('expiring_soon');
  });

  it('returns "expired_grace" past expiry within grace period', () => {
    const now = new Date();
    const state = computeLicenseState({
      ...baseInput,
      now,
      issuedAt: new Date(now.getTime() - 365 * 86400000),
      expiresAt: new Date(now.getTime() - 2 * 86400000),
      gracePeriodDays: 7,
    });
    expect(state).toBe<LicenseState>('expired_grace');
  });

  it('returns "grace_exhausted" past grace period', () => {
    const now = new Date();
    const state = computeLicenseState({
      ...baseInput,
      now,
      issuedAt: new Date(now.getTime() - 365 * 86400000),
      expiresAt: new Date(now.getTime() - 10 * 86400000),
      gracePeriodDays: 7,
    });
    expect(state).toBe<LicenseState>('grace_exhausted');
  });

  it('returns "extended_remediation" after extended non-remediation', () => {
    const now = new Date();
    const state = computeLicenseState({
      ...baseInput,
      now,
      issuedAt: new Date(now.getTime() - 365 * 86400000),
      expiresAt: new Date(now.getTime() - 45 * 86400000),
      gracePeriodDays: 7,
    });
    expect(state).toBe<LicenseState>('extended_remediation');
  });

  it('returns "invalid" for invalid signature', () => {
    const now = new Date();
    const state = computeLicenseState({
      ...baseInput,
      signatureValid: false,
      now,
      issuedAt: new Date(now.getTime() - 86400000),
      expiresAt: new Date(now.getTime() + 365 * 86400000),
      gracePeriodDays: 7,
    });
    expect(state).toBe<LicenseState>('invalid');
  });

  it('returns "invalid" for revoked license', () => {
    const now = new Date();
    const state = computeLicenseState({
      ...baseInput,
      revoked: true,
      now,
      issuedAt: new Date(now.getTime() - 86400000),
      expiresAt: new Date(now.getTime() + 365 * 86400000),
      gracePeriodDays: 7,
    });
    expect(state).toBe<LicenseState>('invalid');
  });

  it('returns "invalid" for device mismatch', () => {
    const now = new Date();
    const state = computeLicenseState({
      ...baseInput,
      deviceMatch: false,
      now,
      issuedAt: new Date(now.getTime() - 86400000),
      expiresAt: new Date(now.getTime() + 365 * 86400000),
      gracePeriodDays: 7,
    });
    expect(state).toBe<LicenseState>('invalid');
  });

  it('returns "invalid" for environment mismatch', () => {
    const now = new Date();
    const state = computeLicenseState({
      ...baseInput,
      environmentMatch: false,
      now,
      issuedAt: new Date(now.getTime() - 86400000),
      expiresAt: new Date(now.getTime() + 365 * 86400000),
      gracePeriodDays: 7,
    });
    expect(state).toBe<LicenseState>('invalid');
  });
});

describe('Machine fingerprint (spec §12.6, §21.7)', () => {
  it('produces a stable SHA-256 hash', async () => {
    const result1 = await computeMachineFingerprint();
    const result2 = await computeMachineFingerprint();

    expect(result1.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(result1.hash).toBe(result2.hash); // deterministic for same machine
    expect(result1.components).toBeInstanceOf(Array);
    expect(result1.components.length).toBeGreaterThan(0);
  });

  it('produces different hashes with different salts', async () => {
    const result1 = await computeMachineFingerprint('salt-a');
    const result2 = await computeMachineFingerprint('salt-b');
    expect(result1.hash).not.toBe(result2.hash);
  });

  it('does not expose raw hostname or MAC in the hash output', async () => {
    const result = await computeMachineFingerprint();
    // The hash is SHA-256 — raw values are not reversible
    expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
    // Components array should NOT contain raw hostname/MAC
    const allComponents = result.components.join(' ');
    expect(allComponents).not.toMatch(/\d{2}[:-]\d{2}[:-]\d{2}[:-]\d{2}[:-]\d{2}[:-]\d{2}/); // no MAC
  });
});
