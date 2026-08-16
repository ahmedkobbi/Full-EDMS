/**
 * @smart-edms/license-core — end-to-end test
 *
 * Verifies the full license lifecycle:
 *  1. Generate an Ed25519 signing key pair.
 *  2. Build a LicensePayload.
 *  3. Sign & build a `.sedmslic` artifact.
 *  4. Verify the artifact with the public key.
 *  5. Tamper with the payload → verify fails.
 *  6. Verify the same flow with ES256 (ECDSA P-256).
 *  7. Test the 6-state license state machine.
 *  8. Test `.sedmsreq` offline request round-trip.
 *  9. Test `.sedmscrl` revocation list build/verify/query.
 * 10. Test machine fingerprint stability.
 * 11. Test heartbeat request signing/verification.
 * 12. Test file serialization round-trip (`.sedmslic` ↔ string ↔ object).
 * 13. Test canonicalization determinism (key order independence).
 *
 * Run: `npx tsx test/index.test.ts`
 */

import assert from 'node:assert/strict';

import type {
  ByteSize,
  CustomerId,
  DeploymentId,
  LicenseId,
  LicensePayload,
  PlanId,
  ProductId,
  RevocationList,
  TenantId,
} from '@smart-edms/types';

import {
  buildHeartbeatRequest,
  buildHeartbeatResponse,
  buildInstallationFingerprint,
  buildLicenseArtifact,
  buildOfflineRequest,
  buildRevocationList,
  canonicalizeJson,
  computeLicenseState,
  computeMachineFingerprint,
  computeMachineFingerprintSync,
  deriveKeyId,
  generateSigningKeyPair,
  isFingerprintRevoked,
  isRevoked,
  parseOfflineRequest,
  parseSedmscrl,
  parseSedmslic,
  parseSedmsreq,
  SEDMSCRL_MIME,
  SEDMSLIC_MIME,
  SEDMSREQ_MIME,
  serializeSedmscrl,
  serializeSedmslic,
  serializeSedmsreq,
  signPayload,
  verifyHeartbeatRequest,
  verifyHeartbeatResponse,
  verifyLicenseArtifact,
  verifyRevocationList,
  verifySignature,
} from '../src/index.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

let pass = 0;
let fail = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    pass++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    fail++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${e instanceof Error ? e.stack ?? e.message : String(e)}`);
  }
}

async function testAsync(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    pass++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    fail++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${e instanceof Error ? e.stack ?? e.message : String(e)}`);
  }
}

function uuid<T extends string>(s: string): T {
  return s as T;
}

// ---------------------------------------------------------------------------
// Build a representative LicensePayload
// ---------------------------------------------------------------------------

function buildSamplePayload(overrides: Partial<LicensePayload> = {}): LicensePayload {
  const now = new Date();
  const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  return {
    v: 1,
    licenseId: uuid<LicenseId>('11111111-1111-1111-1111-111111111111'),
    customerId: uuid<CustomerId>('22222222-2222-2222-2222-222222222222'),
    productId: uuid<ProductId>('33333333-3333-3333-3333-333333333333'),
    planId: uuid<PlanId>('44444444-4444-4444-4444-444444444444'),
    deploymentId: uuid<DeploymentId>('55555555-5555-5555-5555-555555555555'),
    tenantId: uuid<TenantId>('66666666-6666-6666-6666-666666666666'),
    environment: 'production',
    issuedAt: now.toISOString() as LicensePayload['issuedAt'],
    expiresAt: oneYearFromNow.toISOString() as LicensePayload['expiresAt'],
    gracePeriodDays: 14,
    offline: {
      offlineAllowed: true,
      maxOfflineDays: 30,
      hybridSyncAllowed: true,
    },
    fingerprint: {
      fingerprintHash: 'deadbeef'.repeat(8),
      machineId: 'abc123def456',
      os: 'linux',
      arch: 'x64',
      attestation: null,
    },
    entitlements: ['core-edms', 'ocr', 'ai-assistant'],
    aiEntitlements: ['ai-assistant-read', 'ai-assistant-actions'],
    limits: {
      maxUsers: 100,
      maxDevices: 10,
      maxStorageBytes: (1024 * 1024 * 1024 * 100) as ByteSize, // 100 GiB
      maxDocuments: 1_000_000,
      aiMonthlyQuota: 50_000,
      aiDailyQuotaPerUser: 200,
    },
    features: [
      { code: 'advanced-export', value: true, descriptionKey: 'feature.advanced-export' },
      { code: 'max-file-size-mb', value: 1024, descriptionKey: null },
    ],
    renewalCounter: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test groups
// ---------------------------------------------------------------------------

console.log('\n@smart-edms/license-core — end-to-end tests\n');

// --- Key generation & kid derivation --------------------------------------

console.log('Key generation & kid derivation:');

test('EdDSA key pair: kid is 16 hex chars', () => {
  const kp = generateSigningKeyPair('EdDSA');
  assert.match(kp.kid, /^[0-9a-f]{16}$/, `kid was: ${kp.kid}`);
  assert.equal(kp.alg, 'EdDSA');
  assert.match(kp.publicKeyPem, /BEGIN PUBLIC KEY/);
  assert.match(kp.privateKeyPem, /BEGIN PRIVATE KEY/);
});

test('ES256 key pair: kid is 16 hex chars', () => {
  const kp = generateSigningKeyPair('ES256');
  assert.match(kp.kid, /^[0-9a-f]{16}$/, `kid was: ${kp.kid}`);
  assert.equal(kp.alg, 'ES256');
});

test('deriveKeyId is deterministic for the same public key', () => {
  const kp = generateSigningKeyPair('EdDSA');
  const kid2 = deriveKeyId(kp.publicKeyPem);
  assert.equal(kp.kid, kid2);
});

test('default alg is EdDSA', () => {
  const kp = generateSigningKeyPair();
  assert.equal(kp.alg, 'EdDSA');
});

// --- Sign / verify --------------------------------------------------------

console.log('\nSign & verify:');

test('EdDSA sign/verify round-trip on simple object', () => {
  const kp = generateSigningKeyPair('EdDSA');
  const payload = { a: 1, b: 'hello', c: [true, false, null] };
  const sig = signPayload(payload, kp.privateKeyPem, 'EdDSA');
  assert.equal(typeof sig, 'string');
  assert.ok(sig.length > 0);
  assert.equal(verifySignature(payload, sig, kp.publicKeyPem, 'EdDSA'), true);
});

test('ES256 sign/verify round-trip on simple object', () => {
  const kp = generateSigningKeyPair('ES256');
  const payload = { a: 1, b: 'hello', c: [true, false, null] };
  const sig = signPayload(payload, kp.privateKeyPem, 'ES256');
  assert.equal(verifySignature(payload, sig, kp.publicKeyPem, 'ES256'), true);
});

test('verify fails on tampered payload', () => {
  const kp = generateSigningKeyPair('EdDSA');
  const payload = { a: 1, b: 'hello' };
  const sig = signPayload(payload, kp.privateKeyPem, 'EdDSA');
  const tampered = { a: 2, b: 'hello' };
  assert.equal(verifySignature(tampered, sig, kp.publicKeyPem, 'EdDSA'), false);
});

test('verify fails with wrong public key', () => {
  const kp1 = generateSigningKeyPair('EdDSA');
  const kp2 = generateSigningKeyPair('EdDSA');
  const sig = signPayload({ a: 1 }, kp1.privateKeyPem, 'EdDSA');
  assert.equal(verifySignature({ a: 1 }, sig, kp2.publicKeyPem, 'EdDSA'), false);
});

test('verify fails with wrong alg', () => {
  const kp = generateSigningKeyPair('EdDSA');
  const sig = signPayload({ a: 1 }, kp.privateKeyPem, 'EdDSA');
  // Pretend it was ES256 — should fail (key type mismatch).
  assert.equal(verifySignature({ a: 1 }, sig, kp.publicKeyPem, 'ES256'), false);
});

test('sign rejects alg/key mismatch', () => {
  const kp = generateSigningKeyPair('EdDSA');
  assert.throws(() => signPayload({ a: 1 }, kp.privateKeyPem, 'ES256'));
});

// --- License artifact (.sedmslic) -----------------------------------------

console.log('\nLicense artifact (.sedmslic):');

test('build & verify LicenseArtifact with EdDSA', () => {
  const kp = generateSigningKeyPair('EdDSA');
  const payload = buildSamplePayload();
  const artifact = buildLicenseArtifact(payload, kp.privateKeyPem, kp.kid, 'EdDSA');
  assert.equal(artifact.type, 'sedms.license');
  assert.equal(artifact.v, 1);
  assert.equal(artifact.alg, 'ed25519');
  assert.equal(artifact.kid, kp.kid);
  assert.equal(typeof artifact.sig, 'string');

  const result = verifyLicenseArtifact(artifact, kp.publicKeyPem);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.payload.licenseId, payload.licenseId);
  }
});

test('build & verify LicenseArtifact with ES256', () => {
  const kp = generateSigningKeyPair('ES256');
  const payload = buildSamplePayload();
  const artifact = buildLicenseArtifact(payload, kp.privateKeyPem, kp.kid, 'ES256');
  assert.equal(artifact.alg, 'ecdsa-p256-sha256');
  const result = verifyLicenseArtifact(artifact, kp.publicKeyPem);
  assert.equal(result.ok, true);
});

test('tampered payload → verify fails', () => {
  const kp = generateSigningKeyPair('EdDSA');
  const payload = buildSamplePayload();
  const artifact = buildLicenseArtifact(payload, kp.privateKeyPem, kp.kid, 'EdDSA');
  // Tamper with the payload after signing.
  const tampered = {
    ...artifact,
    payload: { ...artifact.payload, gracePeriodDays: 9999 },
  };
  const result = verifyLicenseArtifact(tampered, kp.publicKeyPem);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.reason, /signature/i);
  }
});

test('tampered signature → verify fails', () => {
  const kp = generateSigningKeyPair('EdDSA');
  const payload = buildSamplePayload();
  const artifact = buildLicenseArtifact(payload, kp.privateKeyPem, kp.kid, 'EdDSA');
  // Flip a character in the signature.
  const tampered = { ...artifact, sig: 'A' + artifact.sig.slice(1) };
  const result = verifyLicenseArtifact(tampered, kp.publicKeyPem);
  assert.equal(result.ok, false);
});

test('wrong public key → verify fails', () => {
  const kp1 = generateSigningKeyPair('EdDSA');
  const kp2 = generateSigningKeyPair('EdDSA');
  const payload = buildSamplePayload();
  const artifact = buildLicenseArtifact(payload, kp1.privateKeyPem, kp1.kid, 'EdDSA');
  const result = verifyLicenseArtifact(artifact, kp2.publicKeyPem);
  assert.equal(result.ok, false);
});

test('unsupported version → verify fails', () => {
  const kp = generateSigningKeyPair('EdDSA');
  const payload = buildSamplePayload();
  const artifact = buildLicenseArtifact(payload, kp.privateKeyPem, kp.kid, 'EdDSA');
  const tampered = { ...artifact, v: 999 };
  const result = verifyLicenseArtifact(tampered, kp.publicKeyPem);
  assert.equal(result.ok, false);
});

test('wrong type → verify fails', () => {
  const kp = generateSigningKeyPair('EdDSA');
  const payload = buildSamplePayload();
  const artifact = buildLicenseArtifact(payload, kp.privateKeyPem, kp.kid, 'EdDSA');
  const tampered = { ...artifact, type: 'something.else' as never };
  const result = verifyLicenseArtifact(tampered, kp.publicKeyPem);
  assert.equal(result.ok, false);
});

// --- Canonicalization -----------------------------------------------------

console.log('\nCanonicalization:');

test('key order does not affect canonical form', () => {
  const a = { z: 1, a: 2, m: [3, 4, { y: 5, x: 6 }] };
  const b = { a: 2, m: [3, 4, { x: 6, y: 5 }], z: 1 };
  const ca = canonicalizeJson(a);
  const cb = canonicalizeJson(b);
  assert.equal(ca, cb, `ca=${ca} cb=${cb}`);
  // Keys should be sorted alphabetically.
  assert.ok(ca.indexOf('"a":2') < ca.indexOf('"m":'));
  assert.ok(ca.indexOf('"m":') < ca.indexOf('"z":1'));
});

test('canonical form has no whitespace', () => {
  const c = canonicalizeJson({ a: 1, b: 'two' });
  assert.equal(c, '{"a":1,"b":"two"}');
});

test('nested objects are recursively sorted', () => {
  const c = canonicalizeJson({ outer: { z: 1, a: 2 } });
  assert.equal(c, '{"outer":{"a":2,"z":1}}');
});

test('arrays preserve order', () => {
  const c = canonicalizeJson({ list: ['c', 'a', 'b'] });
  assert.equal(c, '{"list":["c","a","b"]}');
});

test('undefined object properties are omitted', () => {
  const c = canonicalizeJson({ a: 1, b: undefined, c: 3 });
  assert.equal(c, '{"a":1,"c":3}');
});

test('NaN throws', () => {
  assert.throws(() => canonicalizeJson({ x: NaN }));
});

test('circular reference throws', () => {
  const a: Record<string, unknown> = {};
  a.self = a;
  assert.throws(() => canonicalizeJson(a));
});

// --- Offline request (.sedmsreq) ------------------------------------------

console.log('\nOffline request (.sedmsreq):');

test('build & parse round-trip', () => {
  const req = buildOfflineRequest({
    requestId: uuid('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
    productId: uuid('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
    deploymentId: uuid('cccccccc-cccc-cccc-cccc-cccccccccccc'),
    appVersion: '1.0.0',
    generatedAt: new Date().toISOString() as never,
    machineFingerprint: buildInstallationFingerprint('test-salt'),
    installationPublicKey: generateSigningKeyPair('EdDSA').publicKeyPem,
    os: 'linux',
    arch: 'x64',
    contactEmail: 'ops@example.com',
    nonce: 'a'.repeat(32),
  });
  assert.equal(typeof req, 'string');
  // Canonical form: no insignificant whitespace between JSON tokens.
  // (PEM keys legitimately contain spaces in their header/footer lines,
  // so we check that there's no `", "` or `": "` or `" :"` style
  // pretty-printing rather than checking for any space at all.)
  assert.ok(!req.includes('", '));
  assert.ok(!req.includes('": '));
  assert.ok(!req.includes('{ '));
  assert.ok(!req.includes(' }'));
  // Round-trip.
  const parsed = parseOfflineRequest(req);
  assert.equal(parsed.type, 'sedms.request');
  assert.equal(parsed.v, 1);
  assert.equal(parsed.appVersion, '1.0.0');
  assert.equal(parsed.contactEmail, 'ops@example.com');
  assert.equal(parsed.nonce, 'a'.repeat(32));
});

test('serialize + parse round-trip via serialize.ts', () => {
  const canonical = buildOfflineRequest({
    requestId: uuid('dddddddd-dddd-dddd-dddd-dddddddddddd'),
    productId: uuid('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),
    deploymentId: uuid('ffffffff-ffff-ffff-ffff-ffffffffffff'),
    appVersion: '2.0.0',
    generatedAt: new Date().toISOString() as never,
    machineFingerprint: buildInstallationFingerprint(),
    installationPublicKey: '-----BEGIN PUBLIC KEY-----\nMIIB...\n-----END PUBLIC KEY-----\n',
    os: 'darwin',
    arch: 'arm64',
    contactEmail: null,
    nonce: 'b'.repeat(32),
  });
  const parsed = parseOfflineRequest(canonical);
  const pretty = serializeSedmsreq(parsed);
  // Pretty form has whitespace.
  assert.ok(pretty.includes('\n  '));
  const reparsed = parseSedmsreq(pretty);
  assert.equal(reparsed.appVersion, '2.0.0');
  assert.equal(reparsed.os, 'darwin');
});

test('short nonce is rejected', () => {
  assert.throws(() =>
    buildOfflineRequest({
      requestId: uuid('11111111-1111-1111-1111-111111111111'),
      productId: uuid('22222222-2222-2222-2222-222222222222'),
      deploymentId: uuid('33333333-3333-3333-3333-333333333333'),
      appVersion: '1.0.0',
      generatedAt: new Date().toISOString() as never,
      machineFingerprint: buildInstallationFingerprint(),
      installationPublicKey: 'pubkey',
      os: 'linux',
      arch: 'x64',
      contactEmail: null,
      nonce: 'short', // < 16 chars
    }),
  );
});

test('malformed JSON is rejected on parse', () => {
  assert.throws(() => parseOfflineRequest('{not valid json'));
});

test('wrong type is rejected on parse', () => {
  assert.throws(() => parseOfflineRequest(JSON.stringify({ type: 'wrong', v: 1 })));
});

// --- Revocation list (.sedmscrl) ------------------------------------------

console.log('\nRevocation list (.sedmscrl):');

test('build & verify revocation list', () => {
  const kp = generateSigningKeyPair('EdDSA');
  const crl = buildRevocationList(
    {
      revokedLicenseIds: [
        uuid('11111111-1111-1111-1111-111111111111'),
        uuid('22222222-2222-2222-2222-222222222222'),
      ],
      revokedFingerprints: ['deadbeef', 'feedface'],
      generatedAt: new Date().toISOString() as never,
      nextExpectedAt: new Date(Date.now() + 3600_000).toISOString() as never,
    },
    kp.privateKeyPem,
    kp.kid,
    'EdDSA',
  );
  assert.equal(crl.type, 'sedms.crl');
  assert.equal(crl.v, 1);
  assert.equal(crl.revokedLicenseIds.length, 2);
  assert.equal(verifyRevocationList(crl, kp.publicKeyPem), true);
});

test('tampered revocation list fails verification', () => {
  const kp = generateSigningKeyPair('EdDSA');
  const crl = buildRevocationList(
    {
      revokedLicenseIds: [uuid('11111111-1111-1111-1111-111111111111')],
      revokedFingerprints: [],
      generatedAt: new Date().toISOString() as never,
      nextExpectedAt: new Date(Date.now() + 3600_000).toISOString() as never,
    },
    kp.privateKeyPem,
    kp.kid,
    'EdDSA',
  );
  const tampered: RevocationList = {
    ...crl,
    revokedLicenseIds: [
      ...crl.revokedLicenseIds,
      uuid('99999999-9999-9999-9999-999999999999'),
    ],
  };
  assert.equal(verifyRevocationList(tampered, kp.publicKeyPem), false);
});

test('isRevoked returns true for revoked license', () => {
  const kp = generateSigningKeyPair('EdDSA');
  const revokedId = '11111111-1111-1111-1111-111111111111';
  const crl = buildRevocationList(
    {
      revokedLicenseIds: [uuid(revokedId)],
      revokedFingerprints: [],
      generatedAt: new Date().toISOString() as never,
      nextExpectedAt: new Date(Date.now() + 3600_000).toISOString() as never,
    },
    kp.privateKeyPem,
    kp.kid,
    'EdDSA',
  );
  assert.equal(isRevoked(crl, revokedId), true);
  assert.equal(isRevoked(crl, '99999999-9999-9999-9999-999999999999'), false);
});

test('isFingerprintRevoked returns true for revoked fingerprint', () => {
  const kp = generateSigningKeyPair('EdDSA');
  const fp = 'cafebabe';
  const crl = buildRevocationList(
    {
      revokedLicenseIds: [],
      revokedFingerprints: [fp],
      generatedAt: new Date().toISOString() as never,
      nextExpectedAt: new Date(Date.now() + 3600_000).toISOString() as never,
    },
    kp.privateKeyPem,
    kp.kid,
    'EdDSA',
  );
  assert.equal(isFingerprintRevoked(crl, fp), true);
  assert.equal(isFingerprintRevoked(crl, 'deadbeef'), false);
});

test('serialize/parse round-trip preserves signature', () => {
  const kp = generateSigningKeyPair('EdDSA');
  const crl = buildRevocationList(
    {
      revokedLicenseIds: [uuid('11111111-1111-1111-1111-111111111111')],
      revokedFingerprints: [],
      generatedAt: new Date().toISOString() as never,
      nextExpectedAt: new Date(Date.now() + 3600_000).toISOString() as never,
    },
    kp.privateKeyPem,
    kp.kid,
    'EdDSA',
  );
  const serialized = serializeSedmscrl(crl);
  const parsed = parseSedmscrl(serialized);
  assert.equal(verifyRevocationList(parsed, kp.publicKeyPem), true);
});

test('ES256 revocation list verifies', () => {
  const kp = generateSigningKeyPair('ES256');
  const crl = buildRevocationList(
    {
      revokedLicenseIds: [],
      revokedFingerprints: [],
      generatedAt: new Date().toISOString() as never,
      nextExpectedAt: new Date(Date.now() + 3600_000).toISOString() as never,
    },
    kp.privateKeyPem,
    kp.kid,
    'ES256',
  );
  assert.equal(verifyRevocationList(crl, kp.publicKeyPem), true);
});

// --- Machine fingerprint --------------------------------------------------

console.log('\nMachine fingerprint:');

await testAsync('fingerprint is stable across calls (same salt)', async () => {
  const a = await computeMachineFingerprint('my-salt');
  const b = await computeMachineFingerprint('my-salt');
  assert.equal(a.hash, b.hash);
  assert.equal(a.hash.length, 64); // sha256 hex
  assert.ok(a.components.length >= 4);
});

test('fingerprint changes with different salt', () => {
  const a = computeMachineFingerprintSync('salt-A');
  const b = computeMachineFingerprintSync('salt-B');
  assert.notEqual(a.hash, b.hash);
});

test('fingerprint hash is sha256 (64 hex chars)', () => {
  const fp = computeMachineFingerprintSync('x');
  assert.match(fp.hash, /^[0-9a-f]{64}$/);
});

test('buildInstallationFingerprint returns valid shape', () => {
  const fp = buildInstallationFingerprint('deploy-1');
  assert.equal(typeof fp.fingerprintHash, 'string');
  assert.equal(fp.fingerprintHash.length, 64);
  assert.equal(typeof fp.machineId, 'string');
  assert.equal(fp.machineId?.length, 32);
  assert.equal(typeof fp.os, 'string');
  assert.equal(typeof fp.arch, 'string');
  assert.equal(fp.attestation, null);
});

// --- License state machine ------------------------------------------------

console.log('\nLicense state machine (6 states per §4.4):');

const baseStateInput = {
  signatureValid: true,
  revoked: false,
  deviceMatch: true,
  environmentMatch: true,
  now: new Date('2025-06-15T00:00:00.000Z'),
  issuedAt: new Date('2025-01-01T00:00:00.000Z'),
  expiresAt: new Date('2025-12-31T00:00:00.000Z'),
  gracePeriodDays: 14,
  lastHeartbeatAt: new Date('2025-06-14T00:00:00.000Z'),
  heartbeatFailures: 0,
  extendedRemediationThresholdDays: 30,
};

test('valid: signature ok, not expired, healthy heartbeat', () => {
  assert.equal(computeLicenseState({ ...baseStateInput }), 'valid');
});

test('expiring_soon: within 30-day warning window', () => {
  const input = {
    ...baseStateInput,
    now: new Date('2025-12-10T00:00:00.000Z'), // 21 days before expiry
  };
  assert.equal(computeLicenseState(input), 'expiring_soon');
});

test('expired_grace: past expiry but within grace period', () => {
  const input = {
    ...baseStateInput,
    now: new Date('2026-01-05T00:00:00.000Z'), // 5 days past expiry
  };
  assert.equal(computeLicenseState(input), 'expired_grace');
});

test('grace_exhausted: past expiry + grace + extended remediation', () => {
  const input = {
    ...baseStateInput,
    now: new Date('2026-04-30T00:00:00.000Z'), // way past everything
  };
  assert.equal(computeLicenseState(input), 'grace_exhausted');
});

test('extended_remediation: past expiry + grace, within extended window', () => {
  const input = {
    ...baseStateInput,
    now: new Date('2026-02-10T00:00:00.000Z'), // 41 days past expiry, grace=14, ext=30, so total 44 days grace
  };
  // 41 days past expiry, grace (14) exhausted, but within ext (30) → extended_remediation
  assert.equal(computeLicenseState(input), 'extended_remediation');
});

test('invalid: signature failed', () => {
  const input = { ...baseStateInput, signatureValid: false };
  assert.equal(computeLicenseState(input), 'invalid');
});

test('invalid: revoked', () => {
  const input = { ...baseStateInput, revoked: true };
  assert.equal(computeLicenseState(input), 'invalid');
});

test('invalid: device mismatch', () => {
  const input = { ...baseStateInput, deviceMatch: false };
  assert.equal(computeLicenseState(input), 'invalid');
});

test('invalid: environment mismatch', () => {
  const input = { ...baseStateInput, environmentMatch: false };
  assert.equal(computeLicenseState(input), 'invalid');
});

test('perpetual license (null expiry) is valid', () => {
  const input = { ...baseStateInput, expiresAt: null };
  assert.equal(computeLicenseState(input), 'valid');
});

test('heartbeat failures past grace → grace_exhausted', () => {
  const input = {
    ...baseStateInput,
    heartbeatFailures: 5,
    lastHeartbeatAt: new Date('2025-05-01T00:00:00.000Z'), // 45 days ago, > 14 day grace
  };
  assert.equal(computeLicenseState(input), 'grace_exhausted');
});

test('heartbeat failures within grace → extended_remediation', () => {
  const input = {
    ...baseStateInput,
    heartbeatFailures: 3,
    lastHeartbeatAt: new Date('2025-06-10T00:00:00.000Z'), // 5 days ago, > grace/2 (7d)
  };
  // Actually 5 days is less than 7 (gracePeriodDays/2 = 14/2 = 7), so this should be valid.
  // Let me make it 8 days ago.
  const input2 = {
    ...baseStateInput,
    heartbeatFailures: 3,
    lastHeartbeatAt: new Date('2025-06-06T00:00:00.000Z'), // 9 days ago, > grace/2
  };
  assert.equal(computeLicenseState(input), 'valid');
  assert.equal(computeLicenseState(input2), 'extended_remediation');
});

// --- Heartbeat ------------------------------------------------------------

console.log('\nHeartbeat (§12.9):');

test('build & verify heartbeat request with EdDSA', () => {
  const kp = generateSigningKeyPair('EdDSA');
  const req = buildHeartbeatRequest(
    {
      licenseId: uuid('11111111-1111-1111-1111-111111111111'),
      deploymentId: uuid('22222222-2222-2222-2222-222222222222'),
      fingerprintHash: 'deadbeef'.repeat(8),
      appVersion: '1.0.0',
      timestamp: new Date().toISOString() as never,
      usageSummary: {
        activeUsers: 10,
        storageUsedBytes: 1024 * 1024 * 100,
        documentCount: 500,
        aiCallsToday: 25,
      },
    },
    kp.privateKeyPem,
    'EdDSA',
  );
  assert.equal(typeof req.signature, 'string');
  assert.equal(verifyHeartbeatRequest(req, kp.publicKeyPem, 'EdDSA'), true);

  // Tampered request fails.
  const tampered = { ...req, usageSummary: { ...req.usageSummary, activeUsers: 9999 } };
  assert.equal(verifyHeartbeatRequest(tampered, kp.publicKeyPem, 'EdDSA'), false);
});

test('unsigned heartbeat request verifies as false', () => {
  const kp = generateSigningKeyPair('EdDSA');
  const req = buildHeartbeatRequest({
    licenseId: uuid('11111111-1111-1111-1111-111111111111'),
    deploymentId: uuid('22222222-2222-2222-2222-222222222222'),
    fingerprintHash: 'deadbeef'.repeat(8),
    appVersion: '1.0.0',
    timestamp: new Date().toISOString() as never,
    usageSummary: { activeUsers: 0, storageUsedBytes: 0, documentCount: 0, aiCallsToday: 0 },
  });
  assert.equal(verifyHeartbeatRequest(req, kp.publicKeyPem, 'EdDSA'), false);
});

test('build & verify heartbeat response', () => {
  const kp = generateSigningKeyPair('EdDSA');
  const unsignedResponse = {
    status: 'healthy' as const,
    state: 'valid' as const,
    serverTime: new Date().toISOString() as never,
    updatedArtifact: null,
    entitlements: ['core-edms', 'ocr'] as const,
    grace: {
      inGrace: false,
      graceEndsAt: null,
    },
  };
  const signed = buildHeartbeatResponse(unsignedResponse, kp.privateKeyPem, 'EdDSA');
  assert.equal(typeof signed.sig, 'string');
  assert.equal(verifyHeartbeatResponse(signed, kp.publicKeyPem, 'EdDSA'), true);

  // Tampered response fails.
  const tampered = { ...signed, state: 'invalid' as const };
  assert.equal(verifyHeartbeatResponse(tampered, kp.publicKeyPem, 'EdDSA'), false);
});

// --- File serialization ---------------------------------------------------

console.log('\nFile serialization:');

test('.sedmslic serialize/parse round-trip', () => {
  const kp = generateSigningKeyPair('EdDSA');
  const payload = buildSamplePayload();
  const artifact = buildLicenseArtifact(payload, kp.privateKeyPem, kp.kid, 'EdDSA');
  const serialized = serializeSedmslic(artifact);
  assert.ok(serialized.endsWith('\n'));
  assert.ok(serialized.includes('"type": "sedms.license"'));
  const parsed = parseSedmslic(serialized);
  assert.equal(parsed.kid, artifact.kid);
  assert.equal(verifyLicenseArtifact(parsed, kp.publicKeyPem).ok, true);
});

test('.sedmslic parse rejects wrong type', () => {
  assert.throws(() => parseSedmslic(JSON.stringify({ type: 'wrong', v: 1 })));
});

test('.sedmscrl serialize/parse round-trip', () => {
  const kp = generateSigningKeyPair('EdDSA');
  const crl = buildRevocationList(
    {
      revokedLicenseIds: [uuid('11111111-1111-1111-1111-111111111111')],
      revokedFingerprints: ['deadbeef'],
      generatedAt: new Date().toISOString() as never,
      nextExpectedAt: new Date(Date.now() + 3600_000).toISOString() as never,
    },
    kp.privateKeyPem,
    kp.kid,
    'EdDSA',
  );
  const serialized = serializeSedmscrl(crl);
  const parsed = parseSedmscrl(serialized);
  assert.equal(verifyRevocationList(parsed, kp.publicKeyPem), true);
});

// --- MIME constants -------------------------------------------------------

console.log('\nMIME constants:');

test('MIME types are vendor-tree application/x-sedms-*', () => {
  assert.equal(SEDMSLIC_MIME, 'application/x-sedms-license');
  assert.equal(SEDMSREQ_MIME, 'application/x-sedms-request');
  assert.equal(SEDMSCRL_MIME, 'application/x-sedms-crl');
});

// --- Summary --------------------------------------------------------------

console.log(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) {
  console.error('FAILURES DETECTED');
  process.exit(1);
}
console.log('All tests passed.');
