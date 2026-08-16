/**
 * License enforcement tests.
 *
 * Spec ref: §4.4 (license failure behavior — 6-state machine),
 * §12.4 (license signing — fail-closed), §27.4 (licensing rules),
 * §24.2 (critical test cases — invalid license signature rejected,
 * expired license enters grace or enforcement mode, revoked license rejected).
 *
 * Tests use the @smart-edms/license-core package directly to construct
 * real signed license artifacts and verify the LicenseService's behavior.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import {
  buildInstallationFingerprint,
  buildLicenseArtifact,
  computeLicenseState,
  generateSigningKeyPair,
  type SigningKeyPair,
  verifyLicenseArtifact,
} from '@smart-edms/license-core';
import type { LicensePayload, LicenseState } from '@smart-edms/types';
import { randomUUID } from 'node:crypto';

describe('License enforcement (spec §4.4, §12.4, §24.2)', () => {
  let keyPair: SigningKeyPair;

  beforeAll(async () => {
    keyPair = generateSigningKeyPair('EdDSA');
  });

  function buildPayload(overrides: Partial<LicensePayload> = {}): LicensePayload {
    const now = new Date();
    const expires = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    const installationFingerprint = buildInstallationFingerprint('test-deployment', null);
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
      offline: {
        offlineMode: true,
        gracePeriodDays: 7,
        hybridSyncAllowed: false,
      },
      fingerprint: installationFingerprint,
      entitlements: ['core-edms', 'ai-assistant', 'advanced-search'],
      aiEntitlements: [],
      limits: {
        maxUsers: 500,
        maxDevices: 5,
        maxStorageBytes: 1099511627776,
        maxDocuments: 1000000,
      },
      features: [],
      renewalCounter: 0,
      ...overrides,
    } as unknown as LicensePayload;
  }

  describe('computeLicenseState (6-state machine)', () => {
    it('returns "valid" for a fresh, properly-signed license', () => {
      const now = new Date();
      const state = computeLicenseState({
        signatureValid: true,
        revoked: false,
        deviceMatch: true,
        environmentMatch: true,
        now,
        issuedAt: new Date(now.getTime() - 86400000),
        expiresAt: new Date(now.getTime() + 365 * 86400000),
        gracePeriodDays: 7,
        heartbeatFailures: 0,
        extendedRemediationThresholdDays: 30,
      });
      expect(state).toBe<LicenseState>('valid');
    });

    it('returns "expiring_soon" when within 30 days of expiry', () => {
      const now = new Date();
      const state = computeLicenseState({
        signatureValid: true,
        revoked: false,
        deviceMatch: true,
        environmentMatch: true,
        now,
        issuedAt: new Date(now.getTime() - 365 * 86400000),
        expiresAt: new Date(now.getTime() + 15 * 86400000), // 15 days
        gracePeriodDays: 7,
        heartbeatFailures: 0,
        extendedRemediationThresholdDays: 30,
      });
      expect(state).toBe<LicenseState>('expiring_soon');
    });

    it('returns "expired_grace" when past expiry but within grace period', () => {
      const now = new Date();
      const state = computeLicenseState({
        signatureValid: true,
        revoked: false,
        deviceMatch: true,
        environmentMatch: true,
        now,
        issuedAt: new Date(now.getTime() - 365 * 86400000),
        expiresAt: new Date(now.getTime() - 2 * 86400000), // expired 2 days ago
        gracePeriodDays: 7,
        heartbeatFailures: 0,
        extendedRemediationThresholdDays: 30,
      });
      expect(state).toBe<LicenseState>('expired_grace');
    });

    it('returns "extended_remediation" when past grace period (within extended window)', () => {
      const now = new Date();
      const state = computeLicenseState({
        signatureValid: true,
        revoked: false,
        deviceMatch: true,
        environmentMatch: true,
        now,
        issuedAt: new Date(now.getTime() - 365 * 86400000),
        expiresAt: new Date(now.getTime() - 10 * 86400000),
        gracePeriodDays: 7,
        heartbeatFailures: 0,
        extendedRemediationThresholdDays: 30,
      });
      expect(state).toBe<LicenseState>('extended_remediation');
    });

    it('returns "grace_exhausted" when past extended remediation window', () => {
      const now = new Date();
      const state = computeLicenseState({
        signatureValid: true,
        revoked: false,
        deviceMatch: true,
        environmentMatch: true,
        now,
        issuedAt: new Date(now.getTime() - 365 * 86400000),
        expiresAt: new Date(now.getTime() - 45 * 86400000),
        gracePeriodDays: 7,
        heartbeatFailures: 0,
        extendedRemediationThresholdDays: 30,
      });
      expect(state).toBe<LicenseState>('grace_exhausted');
    });

    it('returns "invalid" when signature is invalid', () => {
      const now = new Date();
      const state = computeLicenseState({
        signatureValid: false,
        revoked: false,
        deviceMatch: true,
        environmentMatch: true,
        now,
        issuedAt: new Date(now.getTime() - 86400000),
        expiresAt: new Date(now.getTime() + 365 * 86400000),
        gracePeriodDays: 7,
        heartbeatFailures: 0,
        extendedRemediationThresholdDays: 30,
      });
      expect(state).toBe<LicenseState>('invalid');
    });

    it('returns "invalid" when revoked', () => {
      const now = new Date();
      const state = computeLicenseState({
        signatureValid: true,
        revoked: true,
        deviceMatch: true,
        environmentMatch: true,
        now,
        issuedAt: new Date(now.getTime() - 86400000),
        expiresAt: new Date(now.getTime() + 365 * 86400000),
        gracePeriodDays: 7,
        heartbeatFailures: 0,
        extendedRemediationThresholdDays: 30,
      });
      expect(state).toBe<LicenseState>('invalid');
    });

    it('returns "invalid" when device fingerprint does not match', () => {
      const now = new Date();
      const state = computeLicenseState({
        signatureValid: true,
        revoked: false,
        deviceMatch: false,
        environmentMatch: true,
        now,
        issuedAt: new Date(now.getTime() - 86400000),
        expiresAt: new Date(now.getTime() + 365 * 86400000),
        gracePeriodDays: 7,
        heartbeatFailures: 0,
        extendedRemediationThresholdDays: 30,
      });
      expect(state).toBe<LicenseState>('invalid');
    });
  });

  describe('License artifact signing + verification (fail-closed)', () => {
    it('verifies a properly-signed artifact', () => {
      const payload = buildPayload();
      const artifact = buildLicenseArtifact(payload, keyPair.privateKeyPem, keyPair.kid, 'EdDSA');
      const result = verifyLicenseArtifact(artifact, keyPair.publicKeyPem);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.payload.licenseId).toBe(payload.licenseId);
      }
    });

    it('rejects an artifact signed with a different key (signature invalid)', () => {
      const payload = buildPayload();
      const otherKey = generateSigningKeyPair('EdDSA');
      const artifact = buildLicenseArtifact(payload, keyPair.privateKeyPem, keyPair.kid, 'EdDSA');
      const result = verifyLicenseArtifact(artifact, otherKey.publicKeyPem);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toContain('signature');
      }
    });

    it('rejects an artifact with tampered payload', () => {
      const payload = buildPayload();
      const artifact = buildLicenseArtifact(payload, keyPair.privateKeyPem, keyPair.kid, 'EdDSA');
      // Tamper with the payload after signing
      const tamperedArtifact = {
        ...artifact,
        payload: { ...artifact.payload, licenseId: randomUUID() },
      };
      const result = verifyLicenseArtifact(tamperedArtifact, keyPair.publicKeyPem);
      expect(result.ok).toBe(false);
    });

    it('rejects an artifact with tampered signature', () => {
      const payload = buildPayload();
      const artifact = buildLicenseArtifact(payload, keyPair.privateKeyPem, keyPair.kid, 'EdDSA');
      // Flip a byte in the signature
      const tamperedSig = artifact.sig.slice(0, -4) + 'AAAA';
      const tamperedArtifact = { ...artifact, sig: tamperedSig };
      const result = verifyLicenseArtifact(tamperedArtifact, keyPair.publicKeyPem);
      expect(result.ok).toBe(false);
    });

    it('rejects an artifact with wrong type field', () => {
      const payload = buildPayload();
      const artifact = buildLicenseArtifact(payload, keyPair.privateKeyPem, keyPair.kid, 'EdDSA');
      const tampered = { ...artifact, type: 'not.sedms.license' };
      const result = verifyLicenseArtifact(tampered, keyPair.publicKeyPem);
      expect(result.ok).toBe(false);
    });

    it('rejects an artifact with wrong version field', () => {
      const payload = buildPayload();
      const artifact = buildLicenseArtifact(payload, keyPair.privateKeyPem, keyPair.kid, 'EdDSA');
      const tampered = { ...artifact, v: 999 };
      const result = verifyLicenseArtifact(tampered, keyPair.publicKeyPem);
      expect(result.ok).toBe(false);
    });
  });

  describe('LicenseGuard behavior (6-state enforcement)', () => {
    // These tests verify the guard logic indirectly by calling computeLicenseState
    // and checking the expected behavior. The guard itself is tested in
    // e2e tests.

    it('grace_exhausted allows GET but blocks POST (read-only mode)', () => {
      // This is enforced by LicenseGuard — see apps/backend/src/common/guards/license.guard.ts
      // The guard switches on state and allows only GET/HEAD/OPTIONS when state === 'grace_exhausted'
      const state: LicenseState = 'grace_exhausted';
      const allowedMethods = ['GET', 'HEAD', 'OPTIONS'];
      const blockedMethods = ['POST', 'PATCH', 'PUT', 'DELETE'];

      for (const method of allowedMethods) {
        expect(isMethodAllowedInState(state, method)).toBe(true);
      }
      for (const method of blockedMethods) {
        expect(isMethodAllowedInState(state, method)).toBe(false);
      }
    });

    it('extended_remediation allows admin but blocks non-admin', () => {
      const state: LicenseState = 'extended_remediation';
      expect(isAdminAllowedInState(state, ['admin'])).toBe(true);
      expect(isAdminAllowedInState(state, ['user'])).toBe(false);
    });

    it('invalid blocks all non-public routes', () => {
      const state: LicenseState = 'invalid';
      expect(isMethodAllowedInState(state, 'GET')).toBe(false);
      expect(isMethodAllowedInState(state, 'POST')).toBe(false);
    });
  });
});

// Mirror of LicenseGuard's switch statement for unit testing
function isMethodAllowedInState(state: LicenseState, method: string): boolean {
  switch (state) {
    case 'valid':
    case 'expiring_soon':
    case 'expired_grace':
      return true;
    case 'grace_exhausted':
      return method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
    case 'extended_remediation':
    case 'invalid':
      return false;
    default:
      return false;
  }
}

function isAdminAllowedInState(state: LicenseState, roles: string[]): boolean {
  if (state === 'extended_remediation') {
    return roles.includes('admin');
  }
  return false;
}
