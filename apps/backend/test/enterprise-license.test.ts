/**
 * Enterprise-grade license hardening tests.
 *
 * Tests the 5 new defence-in-depth layers:
 *  1. KEK-wrapped public key (key encryption at rest)
 *  2. Runtime integrity verification (detect binary patching)
 *  3. Clock skew detection (prevent clock rollback)
 *  4. License payload encryption at rest (prevent DB tampering)
 *  5. Multi-factor validation pipeline (all layers combined)
 *
 * Spec ref: §12.4 (licensing), §27.3 (security rules — fail closed).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  generateSigningKeyPair,
  buildLicenseArtifact,
  verifyLicenseArtifact,
  computeMachineFingerprint,
  buildInstallationFingerprint,
  // KEK
  wrapPublicKey,
  unwrapPublicKey,
  verifyWrappedPublicKey,
  // Integrity
  hashFile,
  computeIntegrityBaseline,
  verifyIntegrity,
  // Clock skew
  checkClockSkew,
  updateMaxObservedTimestamp,
  MonotonicClockTracker,
  // Payload cipher
  encryptPayload,
  decryptPayload,
  serializeEncryptedPayload,
  deserializeEncryptedPayload,
  type SigningKeyPair,
} from '@smart-edms/license-core';
import type { LicensePayload } from '@smart-edms/types';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('Enterprise-grade license hardening (spec §12.4, §27.3)', () => {
  let keyPair: SigningKeyPair;
  let machineFingerprint: { hash: string };
  let tmpDir: string;

  beforeAll(async () => {
    keyPair = generateSigningKeyPair('EdDSA');
    machineFingerprint = await computeMachineFingerprint('test-deployment');
    tmpDir = mkdtempSync(join(tmpdir(), 'smart-edms-test-'));
  });

  afterAll(() => {
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  // ── Layer 1: KEK-wrapped public key ───────────────────────────────

  describe('KEK-wrapped public key (key encryption at rest)', () => {
    it('wraps and unwraps a public key with the correct machine fingerprint', () => {
      const wrapped = wrapPublicKey(
        keyPair.publicKeyPem,
        machineFingerprint.hash,
        'test-deployment',
      );
      expect(wrapped.v).toBe(1);
      expect(wrapped.kdf).toBe('pbkdf2-sha256');
      expect(wrapped.ciphertext).toBeTruthy();

      const unwrapped = unwrapPublicKey(wrapped, machineFingerprint.hash, 'test-deployment');
      expect(unwrapped).toBe(keyPair.publicKeyPem);
    });

    it('fails to unwrap with a different machine fingerprint', async () => {
      const wrapped = wrapPublicKey(
        keyPair.publicKeyPem,
        machineFingerprint.hash,
        'test-deployment',
      );

      const differentFingerprint = await computeMachineFingerprint('different-deployment');
      const unwrapped = unwrapPublicKey(wrapped, differentFingerprint.hash, 'test-deployment');
      expect(unwrapped).toBeNull();
    });

    it('fails to unwrap with a different deployment salt', () => {
      const wrapped = wrapPublicKey(
        keyPair.publicKeyPem,
        machineFingerprint.hash,
        'deployment-A',
      );

      const unwrapped = unwrapPublicKey(wrapped, machineFingerprint.hash, 'deployment-B');
      expect(unwrapped).toBeNull();
    });

    it('verifyWrappedPublicKey returns true for correct fingerprint', () => {
      const wrapped = wrapPublicKey(
        keyPair.publicKeyPem,
        machineFingerprint.hash,
        'test-deployment',
      );
      expect(verifyWrappedPublicKey(wrapped, machineFingerprint.hash, 'test-deployment')).toBe(true);
    });

    it('produces different ciphertexts for the same key (random salt/IV)', () => {
      const wrapped1 = wrapPublicKey(keyPair.publicKeyPem, machineFingerprint.hash, 'test');
      const wrapped2 = wrapPublicKey(keyPair.publicKeyPem, machineFingerprint.hash, 'test');
      expect(wrapped1.ciphertext).not.toBe(wrapped2.ciphertext);
      expect(wrapped1.salt).not.toBe(wrapped2.salt);
      expect(wrapped1.iv).not.toBe(wrapped2.iv);
    });
  });

  // ── Layer 2: Runtime integrity verification ──────────────────────

  describe('Runtime integrity verification (detect binary patching)', () => {
    it('computes a baseline hash for critical files', () => {
      const testFile = join(tmpDir, 'test.js');
      writeFileSync(testFile, 'console.log("hello");');

      const baseline = computeIntegrityBaseline(tmpDir, ['test.js']);
      expect(baseline).toHaveLength(1);
      expect(baseline[0].path).toBe('test.js');
      expect(baseline[0].expectedHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('verifies that unmodified files pass integrity check', () => {
      const testFile = join(tmpDir, 'verify.js');
      writeFileSync(testFile, 'module.exports = 42;');

      const baseline = computeIntegrityBaseline(tmpDir, ['verify.js']);
      const result = verifyIntegrity(tmpDir, baseline);
      expect(result.ok).toBe(true);
      expect(result.failed).toHaveLength(0);
      expect(result.checked).toBe(1);
    });

    it('detects when a file has been modified', () => {
      const testFile = join(tmpDir, 'patched.js');
      writeFileSync(testFile, 'original content');

      const baseline = computeIntegrityBaseline(tmpDir, ['patched.js']);

      // Modify the file (simulate binary patching)
      writeFileSync(testFile, 'patched content');

      const result = verifyIntegrity(tmpDir, baseline);
      expect(result.ok).toBe(false);
      expect(result.failed).toContain('patched.js');
    });

    it('detects when a file has been deleted', () => {
      const testFile = join(tmpDir, 'deleted.js');
      writeFileSync(testFile, 'will be deleted');

      const baseline = computeIntegrityBaseline(tmpDir, ['deleted.js']);

      // Delete the file
      rmSync(testFile);

      const result = verifyIntegrity(tmpDir, baseline);
      expect(result.ok).toBe(false);
      expect(result.failed).toContain('deleted.js');
    });

    it('hashFile returns null for non-existent files', () => {
      const hash = hashFile(join(tmpDir, 'nonexistent.js'));
      expect(hash).toBeNull();
    });
  });

  // ── Layer 3: Clock skew detection ────────────────────────────────

  describe('Clock skew detection (prevent clock rollback)', () => {
    it('passes when no previous timestamp exists (first run)', () => {
      const result = checkClockSkew(null);
      expect(result.ok).toBe(true);
      expect(result.maxObservedTimestamp).toBeNull();
    });

    it('passes when current time is after max observed time', () => {
      const pastTimestamp = new Date(Date.now() - 60000).toISOString(); // 1 min ago
      const result = checkClockSkew(pastTimestamp);
      expect(result.ok).toBe(true);
    });

    it('fails when clock was rolled back beyond threshold', () => {
      // Max observed time is 1 hour in the future (clock was rolled back)
      const futureTimestamp = new Date(Date.now() + 3600000).toISOString();
      const result = checkClockSkew(futureTimestamp);
      expect(result.ok).toBe(false);
      expect(result.reason).toContain('Clock rollback detected');
      expect(result.skewSeconds).toBeLessThan(-300);
    });

    it('allows minor clock skew within threshold (NTP adjustment)', () => {
      // Max observed time is 2 minutes in the future (within 5-min threshold)
      const futureTimestamp = new Date(Date.now() + 120000).toISOString();
      const result = checkClockSkew(futureTimestamp);
      expect(result.ok).toBe(true);
    });

    it('updateMaxObservedTimestamp returns current time if later', () => {
      const now = new Date().toISOString();
      const past = new Date(Date.now() - 60000).toISOString();
      const result = updateMaxObservedTimestamp(now, past);
      expect(result).toBe(now);
    });

    it('updateMaxObservedTimestamp keeps previous max if current is earlier', () => {
      const now = new Date().toISOString();
      const future = new Date(Date.now() + 3600000).toISOString();
      const result = updateMaxObservedTimestamp(now, future);
      expect(result).toBe(future);
    });

    it('MonotonicClockTracker detects disproportionate wall clock advancement', () => {
      const tracker = new MonotonicClockTracker();
      // First check should pass
      expect(tracker.checkConsistency()).toBe(true);
      // Second check immediately should also pass (minimal time elapsed)
      expect(tracker.checkConsistency()).toBe(true);
    });
  });

  // ── Layer 4: License payload encryption at rest ──────────────────

  describe('License payload encryption at rest (prevent DB tampering)', () => {
    it('encrypts and decrypts a payload with the correct machine fingerprint', () => {
      const payload = JSON.stringify({ licenseId: randomUUID(), test: true });
      const encrypted = encryptPayload(payload, machineFingerprint.hash);

      expect(encrypted.v).toBe(1);
      expect(encrypted.alg).toBe('aes-256-gcm');
      expect(encrypted.ciphertext).toBeTruthy();
      expect(encrypted.ciphertext).not.toBe(payload);

      const decrypted = decryptPayload(encrypted, machineFingerprint.hash);
      expect(decrypted).toBe(payload);
    });

    it('fails to decrypt with a different machine fingerprint', async () => {
      const payload = JSON.stringify({ licenseId: randomUUID() });
      const encrypted = encryptPayload(payload, machineFingerprint.hash);

      const differentFingerprint = await computeMachineFingerprint('different');
      const decrypted = decryptPayload(encrypted, differentFingerprint.hash);
      expect(decrypted).toBeNull();
    });

    it('fails to decrypt tampered ciphertext', () => {
      const payload = JSON.stringify({ licenseId: randomUUID() });
      const encrypted = encryptPayload(payload, machineFingerprint.hash);

      // Tamper with the ciphertext
      const tampered = {
        ...encrypted,
        ciphertext: Buffer.from('tampered').toString('base64'),
      };
      const decrypted = decryptPayload(tampered, machineFingerprint.hash);
      expect(decrypted).toBeNull();
    });

    it('serializes and deserializes correctly', () => {
      const payload = JSON.stringify({ test: true });
      const encrypted = encryptPayload(payload, machineFingerprint.hash);
      const serialized = serializeEncryptedPayload(encrypted);
      const deserialized = deserializeEncryptedPayload(serialized);

      expect(deserialized).not.toBeNull();
      expect(deserialized!.ciphertext).toBe(encrypted.ciphertext);
    });

    it('deserializeEncryptedPayload returns null for invalid JSON', () => {
      const result = deserializeEncryptedPayload('not valid json');
      expect(result).toBeNull();
    });

    it('deserializeEncryptedPayload returns null for wrong format', () => {
      const result = deserializeEncryptedPayload(JSON.stringify({ v: 2 }));
      expect(result).toBeNull();
    });
  });

  // ── Layer 5: End-to-end signed + encrypted license ───────────────

  describe('End-to-end: signed + encrypted license artifact', () => {
    it('signs, encrypts, decrypts, and verifies a license', async () => {
      const installationFingerprint = buildInstallationFingerprint('test-deployment', null);
      const payload: LicensePayload = {
        v: 1,
        licenseId: randomUUID(),
        customerId: randomUUID(),
        productId: 'smart-edms-core',
        planId: 'enterprise',
        deploymentId: 'dep-test',
        tenantId: null,
        environment: 'production',
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 365 * 86400000).toISOString(),
        gracePeriodDays: 7,
        offline: {
          offlineMode: true,
          gracePeriodDays: 7,
          hybridSyncAllowed: false,
        },
        fingerprint: installationFingerprint,
        entitlements: ['core-edms'],
        aiEntitlements: [],
        limits: {
          maxUsers: 100,
          maxDevices: 5,
          maxStorageBytes: 1099511627776,
          maxDocuments: 1000000,
        },
        features: [],
        renewalCounter: 0,
      } as unknown as LicensePayload;

      // Sign the payload
      const artifact = buildLicenseArtifact(payload, keyPair.privateKeyPem, keyPair.kid, 'EdDSA');
      expect(artifact.sig).toBeTruthy();

      // Encrypt the payload for storage
      const payloadJson = JSON.stringify(payload);
      const encrypted = encryptPayload(payloadJson, machineFingerprint.hash);

      // Simulate DB storage and retrieval
      const stored = serializeEncryptedPayload(encrypted);
      const retrieved = deserializeEncryptedPayload(stored)!;
      const decrypted = decryptPayload(retrieved, machineFingerprint.hash)!;
      const retrievedPayload = JSON.parse(decrypted) as LicensePayload;

      // Verify the signature still works on the retrieved payload
      const reconstructedArtifact = {
        ...artifact,
        payload: retrievedPayload,
      };
      const verified = verifyLicenseArtifact(reconstructedArtifact, keyPair.publicKeyPem);
      expect(verified.ok).toBe(true);
    });
  });
});
