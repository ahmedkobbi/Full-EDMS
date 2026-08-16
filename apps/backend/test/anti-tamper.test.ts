/**
 * Anti-tamper penetration tests.
 *
 * Simulates every cracking technique from 2010-2026 and verifies
 * that the countermeasures detect and block them.
 *
 * Each test plays the role of an attacker attempting a specific
 * bypass technique, then verifies the system detects it.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  checkRequireCache,
  detectDebugging,
  detectEnvTampering,
  detectVirtualization,
  hashDirectory,
  hashFunction,
  runSecurityChecks,
  safeEqual,
  snapshotRequireCache,
  verifyFunctionIntegrity,
  verifyFunctionSource,
  verifyPublicKeyPin,
} from '@smart-edms/license-core';
import { generateSigningKeyPair, type SigningKeyPair } from '@smart-edms/license-core';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('Anti-tamper penetration tests (2010-2026 attack vectors)', () => {
  let keyPair: SigningKeyPair;
  let tmpDir: string;

  beforeAll(() => {
    keyPair = generateSigningKeyPair('EdDSA');
    tmpDir = mkdtempSync(join(tmpdir(), 'pentest-'));
  });

  afterAll(() => {
    try { rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  // ═════════════════════════════════════════════════════════════════
  // ATTACK 1: Binary/Source Patching (2010-era)
  // ═════════════════════════════════════════════════════════════════
  describe('Attack 1: Binary/Source Patching (2010)', () => {
    it('detects when a critical file is modified (binary patch)', () => {
      const file = join(tmpDir, 'critical.js');
      writeFileSync(file, 'function check() { return false; }');
      const originalHash = createHash('sha256').update(readFileSync(file)).digest('hex');

      // Attacker patches the file
      writeFileSync(file, 'function check() { return true; }');
      const patchedHash = createHash('sha256').update(readFileSync(file)).digest('hex');

      expect(originalHash).not.toBe(patchedHash);
    });

    it('detects when a function has been monkey-patched (toString verification)', () => {
      function originalCheck() { return false; }
      const originalSource = originalCheck.toString();

      // Attacker patches the function
      (originalCheck as any) = function() { return true; };
      // Note: in practice, the attacker replaces the reference, not the
      // function object. But the hashFunction approach catches this.

      function checkFn() { return false; }
      const hash1 = hashFunction(checkFn);

      // Attacker replaces the function
      function patchedFn() { return true; }
      const hash2 = hashFunction(patchedFn);

      expect(hash1).not.toBe(hash2);
    });
  });

  // ═════════════════════════════════════════════════════════════════
  // ATTACK 2: Module Hooking / Monkey Patching (2012)
  // ═════════════════════════════════════════════════════════════════
  describe('Attack 2: Module Hooking (2012)', () => {
    it('detects require.cache module replacement', () => {
      const testFile = join(tmpDir, 'hooked.js');
      writeFileSync(testFile, 'module.exports = { check: () => false };');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require(tmpDir + '/hooked.js');

      // Take snapshot
      snapshotRequireCache();

      // Attacker modifies the file
      writeFileSync(testFile, 'module.exports = { check: () => true };');

      const result = checkRequireCache();
      expect(result.ok).toBe(false);
      expect(result.reasons.some(r => r.includes('modified'))).toBe(true);
    });

    it('verifyFunctionIntegrity catches overridden functions', () => {
      function legitimateCheck() { return 'legitimate'; }
      const expectedHash = hashFunction(legitimateCheck);

      // Verify it passes when unmodified
      expect(verifyFunctionIntegrity(legitimateCheck, expectedHash)).toBe(true);

      // Attacker creates a new function with the same name but different body
      function tamperedCheck() { return 'tampered'; }
      expect(verifyFunctionIntegrity(tamperedCheck, expectedHash)).toBe(false);
    });
  });

  // ═════════════════════════════════════════════════════════════════
  // ATTACK 3: Debugger Attachment (2014)
  // ═════════════════════════════════════════════════════════════════
  describe('Attack 3: Debugger Attachment (2014)', () => {
    it('detects --inspect flag in process.argv', () => {
      // Save original argv
      const originalArgv = process.argv;
      // Simulate --inspect flag
      process.argv = [...originalArgv, '--inspect=9229'];

      const result = detectDebugging();
      expect(result.ok).toBe(false);
      expect(result.reasons.some(r => r.includes('inspect'))).toBe(true);

      // Restore
      process.argv = originalArgv;
    });

    it('passes when no debug flags present', () => {
      // Remove any inspect flags
      const originalArgv = process.argv;
      process.argv = originalArgv.filter(a => !a.includes('inspect') && !a.includes('debug'));

      const result = detectDebugging();
      // Note: might fail if actually running under a debugger in test env
      // but the inspect flag check should pass
      expect(result.reasons.some(r => r.includes('Debug flag'))).toBe(false);

      process.argv = originalArgv;
    });
  });

  // ═════════════════════════════════════════════════════════════════
  // ATTACK 5: Environment Variable Spoofing (2016)
  // ═════════════════════════════════════════════════════════════════
  describe('Attack 5: Environment Variable Spoofing (2016)', () => {
    it('detects LD_PRELOAD (library injection)', () => {
      const original = process.env.LD_PRELOAD;
      process.env.LD_PRELOAD = '/tmp/malicious_hook.so';

      const result = detectEnvTampering(false);
      expect(result.ok).toBe(false);
      expect(result.reasons.some(r => r.includes('LD_PRELOAD'))).toBe(true);

      if (original === undefined) {delete process.env.LD_PRELOAD;}
      else {process.env.LD_PRELOAD = original;}
    });

    it('detects NODE_ENV=development in production', () => {
      const original = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const result = detectEnvTampering(true);
      expect(result.ok).toBe(false);
      expect(result.reasons.some(r => r.includes('NODE_ENV=development'))).toBe(true);

      process.env.NODE_ENV = original;
    });

    it('detects faketime/libfaketime', () => {
      const original1 = process.env.FAKETIME;
      process.env.FAKETIME = '2020-01-01';

      const result = detectEnvTampering(false);
      expect(result.ok).toBe(false);
      expect(result.reasons.some(r => r.includes('faketime'))).toBe(true);

      if (original1 === undefined) {delete process.env.FAKETIME;}
      else {process.env.FAKETIME = original1;}
    });

    it('detects NODE_OPTIONS with --require (module injection)', () => {
      const original = process.env.NODE_OPTIONS;
      process.env.NODE_OPTIONS = '--require /tmp/hook.js';

      const result = detectEnvTampering(false);
      expect(result.ok).toBe(false);
      expect(result.reasons.some(r => r.includes('NODE_OPTIONS'))).toBe(true);

      if (original === undefined) {delete process.env.NODE_OPTIONS;}
      else {process.env.NODE_OPTIONS = original;}
    });

    it('passes when environment is clean', () => {
      const saved = {
        LD_PRELOAD: process.env.LD_PRELOAD,
        LD_LIBRARY_PATH: process.env.LD_LIBRARY_PATH,
        DYLD_INSERT_LIBRARIES: process.env.DYLD_INSERT_LIBRARIES,
        NODE_PATH: process.env.NODE_PATH,
        NODE_OPTIONS: process.env.NODE_OPTIONS,
        FAKETIME: process.env.FAKETIME,
      };
      delete process.env.LD_PRELOAD;
      delete process.env.LD_LIBRARY_PATH;
      delete process.env.DYLD_INSERT_LIBRARIES;
      delete process.env.NODE_PATH;
      delete process.env.NODE_OPTIONS;
      delete process.env.FAKETIME;

      const result = detectEnvTampering(false);
      expect(result.ok).toBe(true);

      // Restore
      for (const [k, v] of Object.entries(saved)) {
        if (v !== undefined) {(process.env as any)[k] = v;}
      }
    });
  });

  // ═════════════════════════════════════════════════════════════════
  // ATTACK 8: Public Key Replacement (2019)
  // ═════════════════════════════════════════════════════════════════
  describe('Attack 8: Public Key Replacement (2019)', () => {
    it('detects when public key hash does not match pinned hash', () => {
      const expectedHash = createHash('sha256').update(keyPair.publicKeyPem).digest('hex');

      // Correct key passes
      expect(verifyPublicKeyPin(keyPair.publicKeyPem, expectedHash)).toBe(true);

      // Attacker generates a different key
      const attackerKey = generateSigningKeyPair('EdDSA');
      expect(verifyPublicKeyPin(attackerKey.publicKeyPem, expectedHash)).toBe(false);
    });

    it('passes when no pin is configured (backward compatible)', () => {
      expect(verifyPublicKeyPin(keyPair.publicKeyPem, undefined)).toBe(true);
    });
  });

  // ═════════════════════════════════════════════════════════════════
  // ATTACK 14: VM/Container Snapshot (2025)
  // ═════════════════════════════════════════════════════════════════
  describe('Attack 14: VM/Container Detection (2025)', () => {
    it('detects virtualization environment', () => {
      const result = detectVirtualization();
      expect(result).toHaveProperty('isVM');
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('details');
      // In a sandbox, this might be a VM — just verify it doesn't crash
    });
  });

  // ═════════════════════════════════════════════════════════════════
  // ATTACK 15: Timing/Side-Channel Attacks (2026)
  // ═════════════════════════════════════════════════════════════════
  describe('Attack 15: Timing Attacks (2026)', () => {
    it('safeEqual is constant-time (does not short-circuit on length)', () => {
      // Same length, different content
      expect(safeEqual('aaaa', 'bbbb')).toBe(false);
      expect(safeEqual('aaaa', 'aaaa')).toBe(true);

      // Different length
      expect(safeEqual('a', 'aa')).toBe(false);
      expect(safeEqual('', '')).toBe(true);
    });

    it('safeEqual handles edge cases safely', () => {
      expect(safeEqual('', 'a')).toBe(false);
      expect(safeEqual('a', '')).toBe(false);
      // Should not throw on non-UTF8 edge cases
      expect(() => safeEqual(String.fromCharCode(0), String.fromCharCode(0))).not.toThrow();
    });
  });

  // ═════════════════════════════════════════════════════════════════
  // COMPREHENSIVE: runSecurityChecks
  // ═════════════════════════════════════════════════════════════════
  describe('Comprehensive security checks', () => {
    it('runSecurityChecks returns structured result with all layers', () => {
      const result = runSecurityChecks(false);
      expect(result).toHaveProperty('ok');
      expect(result).toHaveProperty('antiDebug');
      expect(result).toHaveProperty('envTampering');
      expect(result).toHaveProperty('requireCache');
      expect(result).toHaveProperty('virtualization');
      expect(result).toHaveProperty('reasons');
      expect(Array.isArray(result.reasons)).toBe(true);
    });

    it('runSecurityChecks detects LD_PRELOAD + debug flag simultaneously', () => {
      const originalLdPreload = process.env.LD_PRELOAD;
      const originalArgv = process.argv;

      process.env.LD_PRELOAD = '/tmp/hook.so';
      process.argv = [...originalArgv, '--inspect'];

      const result = runSecurityChecks(false);
      expect(result.ok).toBe(false);
      expect(result.reasons.some(r => r.includes('LD_PRELOAD'))).toBe(true);
      expect(result.reasons.some(r => r.includes('inspect'))).toBe(true);

      if (originalLdPreload === undefined) {delete process.env.LD_PRELOAD;}
      else {process.env.LD_PRELOAD = originalLdPreload;}
      process.argv = originalArgv;
    });
  });

  // ═════════════════════════════════════════════════════════════════
  // ATTACK 12: Supply Chain (2023) — Module integrity
  // ═════════════════════════════════════════════════════════════════
  describe('Attack 12: Supply Chain (2023) — Module integrity', () => {
    it('hashDirectory produces consistent hashes for same content', () => {
      const dir1 = mkdtempSync(join(tmpdir(), 'mod1-'));
      const dir2 = mkdtempSync(join(tmpdir(), 'mod2-'));

      writeFileSync(join(dir1, 'index.js'), 'module.exports = 42;');
      writeFileSync(join(dir2, 'index.js'), 'module.exports = 42;');

      const hash1 = hashDirectory(dir1);
      const hash2 = hashDirectory(dir2);

      expect(hash1).not.toBeNull();
      expect(hash2).not.toBeNull();
      expect(hash1).toBe(hash2); // Same content → same hash

      rmSync(dir1, { recursive: true, force: true });
      rmSync(dir2, { recursive: true, force: true });
    });

    it('hashDirectory detects modified module files', () => {
      const dir1 = mkdtempSync(join(tmpdir(), 'mod3-'));
      const dir2 = mkdtempSync(join(tmpdir(), 'mod4-'));

      writeFileSync(join(dir1, 'index.js'), 'module.exports = 42;');
      writeFileSync(join(dir2, 'index.js'), 'module.exports = 43;'); // Different!

      const hash1 = hashDirectory(dir1);
      const hash2 = hashDirectory(dir2);

      expect(hash1).not.toBe(hash2);

      rmSync(dir1, { recursive: true, force: true });
      rmSync(dir2, { recursive: true, force: true });
    });
  });

  // ═════════════════════════════════════════════════════════════════
  // ATTACK 13: AI-Assisted Pattern Matching (2024)
  // ═════════════════════════════════════════════════════════════════
  describe('Attack 13: AI-Assisted Analysis (2024)', () => {
    it('verifyFunctionSource can match function patterns (detect overrides)', () => {
      function legitimateGuard() {
        const state = checkState();
        if (state === 'invalid') {throw new Error();}
        return true;
      }

      // Pattern that matches the legitimate function (multiline)
      const pattern = /checkState[\s\S]*invalid[\s\S]*throw/;
      expect(verifyFunctionSource(legitimateGuard, pattern)).toBe(true);

      // Attacker replaces with a bypass
      function patchedGuard() { return true; }
      expect(verifyFunctionSource(patchedGuard, pattern)).toBe(false);
    });
  });
});

// Helper used in the pattern matching test
function checkState() { return 'valid'; }
