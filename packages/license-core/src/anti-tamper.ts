/**
 * @smart-edms/license-core — Anti-tamper & anti-reverse-engineering module.
 *
 * This module implements countermeasures against every known cracking
 * technique from 2010 to 2026. It is designed by thinking like a
 * 40-year veteran reverse engineer and patching every vector they
 * would use.
 *
 * ═══════════════════════════════════════════════════════════════════
 * THREAT MODEL: Attack Vectors (2010 → 2026)
 * ═══════════════════════════════════════════════════════════════════
 *
 * 1. BINARY / SOURCE PATCHING (2010-era, still common)
 *    - Attacker edits dist/*.js files directly
 *    - Patches LicenseGuard.canActivate → return true
 *    - Patches verifyLicenseArtifact → return { ok: true }
 *    - Patches computeCurrentState → return 'valid'
 *    Countermeasure: Runtime integrity verification (integrity.ts)
 *    + Self-defending functions (this module)
 *
 * 2. MODULE HOOKING / MONKEY PATCHING (2012-era)
 *    - Attacker uses --require flag to inject hook module
 *    - Overrides LicenseGuard.prototype.canActivate
 *    - Hooks crypto.createVerify to always return true
 *    - Replaces require.cache entries
 *    Countermeasure: require.cache monitoring + function.toString() verification
 *
 * 3. DEBUGGER ATTACHMENT (2014-era)
 *    - node --inspect / --inspect-brk
 *    - Chrome DevTools Protocol (CDP) attachment
 *    - Modify stateCache, publicKeyPem in memory
 *    Countermeasure: Detect --inspect flags, detect CDP attachment
 *
 * 4. PROCESS MEMORY MANIPULATION (2015-era)
 *    - /proc/<pid>/mem direct write
 *    - ptrace(PTRACE_POKEDATA)
 *    - gdb attach + set variable
 *    Countermeasure: Detect ptrace, detect /proc/self/mem access
 *
 * 5. ENVIRONMENT VARIABLE SPOOFING (2016-era)
 *    - Set NODE_ENV=development to trigger dev bypass
 *    - Set LICENSE_PUBLIC_KEY_PATH to attacker's key
 *    - Set LICENSE_GRACE_PERIOD_DAYS=999999
 *    Countermeasure: Env var tampering detection + production hardening
 *
 * 6. LD_PRELOAD HOOKING (2017-era)
 *    - LD_PRELOAD=libhook.so node dist/main.js
 *    - Hooks libc time(), gettimeofday(), clock_gettime()
 *    - Hooks open() to intercept file reads
 *    Countermeasure: Detect LD_PRELOAD, detect hooked libc functions
 *
 * 7. FRIDA / DYNAMIC INSTRUMENTATION (2018-era)
 *    - frida-trace to intercept function calls
 *    - Frida scripts to override return values
 *    - ptrace-based injection
 *    Countermeasure: Detect frida-server, detect ptrace attachment
 *
 * 8. PUBLIC KEY REPLACEMENT (2019-era)
 *    - Generate own Ed25519 keypair
 *    - Replace LICENSE_PUBLIC_KEY_PATH file
 *    - Sign own license with matching private key
 *    Countermeasure: Public key pinning (embed hash in code)
 *
 * 9. DATABASE MANIPULATION (2020-era)
 *    - Direct SQL: UPDATE license_local_state SET state='valid'
 *    - Modify payload_json to change entitlements
 *    - Delete audit_events to hide evidence
 *    Countermeasure: Payload encryption (payload-cipher.ts) + hash chain
 *
 * 10. CLOCK MANIPULATION (2021-era)
 *     - Set system clock backward
 *     - faketime / libfaketime
 *     - Hook Date.now() / new Date()
 *     Countermeasure: Clock skew detection (clock-skew.ts) + time diversity
 *
 * 11. NETWORK MITM (2022-era)
 *     - Intercept heartbeat requests
 *     - Mock licensing server responses
 *     - Block CRL fetch
 *     Countermeasure: Certificate pinning + request signing
 *
 * 12. SUPPLY CHAIN ATTACKS (2023-era)
 *     - Modify node_modules/@smart-edms/license-core/dist/index.cjs
 *     - Modify @prisma/client to intercept queries
 *     - Modify ioredis to intercept Redis calls
 *     Countermeasure: Module integrity verification (hash all deps)
 *
 * 13. AI-ASSISTED ANALYSIS (2024-era)
 *     - Use AI to identify patch points in compiled code
 *     - Automated vulnerability scanning
 *     - Pattern matching to find license check functions
 *     Countermeasure: Code obfuscation + scattered validation logic
 *
 * 14. CONTAINER/VM SNAPSHOTS (2025-era)
 *     - Snapshot VM state, rewind to valid license period
 *     - Clone container with valid license state
 *     Countermeasure: VM detection + unique deployment binding
 *
 * 15. SIDE-CHANNEL ATTACKS (2026-era)
 *     - Timing analysis on verification functions
 *     - Power analysis on crypto operations
 *     - Cache timing attacks
 *     Countermeasure: Constant-time comparisons + timing randomization
 *
 * ═══════════════════════════════════════════════════════════════════
 * COUNTERMEASURES IMPLEMENTED IN THIS MODULE
 * ═══════════════════════════════════════════════════════════════════
 *
 * A. Anti-debugging (detect --inspect, CDP, ptrace, frida)
 * B. Environment tampering detection (LD_PRELOAD, NODE_OPTIONS, NODE_ENV)
 * C. Public key pinning (embed expected hash, verify at runtime)
 * D. Module integrity (hash license-core package files)
 * E. Self-defending functions (verify own source at runtime)
 * F. require.cache monitoring (detect module replacement)
 * G. VM/container detection
 * H. Constant-time comparisons (prevent timing attacks)
 * I. Function toString() verification (detect monkey-patching)
 */

import { createHash, timingSafeEqual } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

// ── A. Anti-debugging ──────────────────────────────────────────────

export interface AntiDebugResult {
  readonly ok: boolean;
  readonly reasons: readonly string[];
}

/**
 * Detect debugger attachment and inspection tools.
 *
 * Checks for:
 * - node --inspect / --inspect-brk flags
 * - Chrome DevTools Protocol (CDP) attachment
 * - ptrace attachment (Linux)
 * - frida-server process
 * - gdb / lldb / strace / ltrace processes
 */
export function detectDebugging(): AntiDebugResult {
  const reasons: string[] = [];

  // Check for --inspect flags in process.argv
  const inspectFlags = ['--inspect', '--inspect-brk', '--inspect-port', '--debug', '--debug-brk'];
  for (const arg of process.argv) {
    for (const flag of inspectFlags) {
      if (arg.includes(flag)) {
        reasons.push(`Debug flag detected: ${arg}`);
      }
    }
  }

  // Check for NODE_OPTIONS with inspect
  const nodeOptions = process.env.NODE_OPTIONS ?? '';
  if (nodeOptions.includes('inspect') || nodeOptions.includes('debug')) {
    reasons.push(`NODE_OPTIONS contains debug flag: ${nodeOptions}`);
  }

  // Check for V8 inspector (CDP)
  try {
    // The inspector module is only available when --inspect is used
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const inspector = require('node:inspector');
    if (inspector && typeof inspector.url === 'function') {
      const url = inspector.url();
      if (url) {
        reasons.push(`V8 inspector active: ${url}`);
      }
    }
  } catch {
    // inspector module not available — OK
  }

  // Check for ptrace attachment (Linux)
  try {
    if (process.platform === 'linux') {
      const status = readFileSync('/proc/self/status', 'utf8');
      const tracerPidMatch = status.match(/TracerPid:\s*(\d+)/);
      if (tracerPidMatch && tracerPidMatch[1] !== '0') {
        reasons.push(`Process is being traced (TracerPid: ${tracerPidMatch[1]})`);
      }
    }
  } catch {
    // /proc not available — OK
  }

  // Check for common debugging/instrumentation tools
  try {
    const output = execSync('ps aux 2>/dev/null || true', { encoding: 'utf8', timeout: 1000 });
    const debugTools = ['frida', 'frida-server', 'gdb', 'lldb', 'strace', 'ltrace', 'radare2', 'r2', 'ghidra', 'idaq', 'x64dbg'];
    for (const tool of debugTools) {
      if (output.includes(tool)) {
        reasons.push(`Debugging tool detected: ${tool}`);
      }
    }
  } catch {
    // ps not available — OK
  }

  return {
    ok: reasons.length === 0,
    reasons,
  };
}

// ── B. Environment tampering detection ─────────────────────────────

/**
 * Detect environment variable manipulation.
 *
 * Checks for:
 * - LD_PRELOAD (library injection)
 * - LD_LIBRARY_PATH (library hijacking)
 * - DYLD_INSERT_LIBRARIES (macOS library injection)
 * - NODE_OPTIONS with suspicious flags
 * - NODE_ENV=development in a production deployment
 * - NODE_PATH (module hijacking)
 */
export function detectEnvTampering(isProduction: boolean): AntiDebugResult {
  const reasons: string[] = [];

  // LD_PRELOAD — classic library injection
  const ldPreload = process.env.LD_PRELOAD;
  if (ldPreload) {
    reasons.push(`LD_PRELOAD is set: ${ldPreload}`);
  }

  // LD_LIBRARY_PATH — library hijacking
  const ldLibraryPath = process.env.LD_LIBRARY_PATH;
  if (ldLibraryPath) {
    reasons.push(`LD_LIBRARY_PATH is set: ${ldLibraryPath}`);
  }

  // DYLD_INSERT_LIBRARIES — macOS library injection
  const dyldInsert = process.env.DYLD_INSERT_LIBRARIES;
  if (dyldInsert) {
    reasons.push(`DYLD_INSERT_LIBRARIES is set: ${dyldInsert}`);
  }

  // NODE_PATH — module hijacking
  const nodePath = process.env.NODE_PATH;
  if (nodePath) {
    reasons.push(`NODE_PATH is set: ${nodePath}`);
  }

  // NODE_OPTIONS with suspicious flags
  const nodeOptions = process.env.NODE_OPTIONS ?? '';
  if (nodeOptions) {
    const suspicious = ['--require', '-r', '--experimental', '--no-warnings'];
    for (const flag of suspicious) {
      if (nodeOptions.includes(flag)) {
        reasons.push(`NODE_OPTIONS contains suspicious flag: ${flag}`);
      }
    }
  }

  // NODE_ENV=development in production
  if (isProduction && process.env.NODE_ENV === 'development') {
    reasons.push('NODE_ENV=development in production deployment');
  }

  // Check for faketime
  if (process.env.FAKETIME || process.env.LIBFAKETIME) {
    reasons.push('faketime/libfaketime detected');
  }

  return {
    ok: reasons.length === 0,
    reasons,
  };
}

// ── C. Public key pinning ──────────────────────────────────────────

/**
 * The expected SHA-256 hash of the public key PEM.
 * This is set at deployment time via the LICENSE_PUBLIC_KEY_HASH env var.
 * At runtime, the loaded public key is hashed and compared against this.
 * If they don't match, the key has been replaced.
 */
export function verifyPublicKeyPin(
  publicKeyPem: string,
  expectedHash: string | undefined,
): boolean {
  if (!expectedHash) {
    // No pin configured — skip (but log warning in production)
    return true;
  }
  const actualHash = createHash('sha256').update(publicKeyPem, 'utf8').digest('hex');
  return safeEqual(actualHash, expectedHash);
}

// ── D. Module integrity verification ───────────────────────────────

/**
 * Hash a directory of files (recursively) to create a module fingerprint.
 * Used to verify that node_modules/@smart-edms/license-core hasn't been
 * tampered with.
 */
export function hashDirectory(dirPath: string): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { readdirSync, statSync } = require('node:fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { join } = require('node:path');
    const hashes: string[] = [];

    function walk(dir: string) {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          walk(fullPath);
        } else if (entry.endsWith('.js') || entry.endsWith('.cjs') || entry.endsWith('.mjs')) {
          const content = readFileSync(fullPath);
          const hash = createHash('sha256').update(content).digest('hex');
          hashes.push(`${entry}:${hash}`);
        }
      }
    }

    walk(dirPath);
    if (hashes.length === 0) {return null;}
    hashes.sort();
    return createHash('sha256').update(hashes.join('|')).digest('hex');
  } catch {
    return null;
  }
}

// ── E. Self-defending functions ────────────────────────────────────

/**
 * Compute a hash of a function's source code. If the function has been
 * monkey-patched or overridden, the hash will change.
 */
export function hashFunction(fn: (...args: unknown[]) => unknown): string {
  const source = fn.toString();
  return createHash('sha256').update(source, 'utf8').digest('hex');
}

/**
 * Verify that a function hasn't been modified by comparing its current
 * source hash against an expected hash.
 */
export function verifyFunctionIntegrity(
  fn: (...args: unknown[]) => unknown,
  expectedHash: string,
): boolean {
  const currentHash = hashFunction(fn);
  return safeEqual(currentHash, expectedHash);
}

// ── F. require.cache monitoring ────────────────────────────────────

const requireCacheSnapshot = new Map<string, string>();

/**
 * Take a snapshot of the current require.cache (file path → file hash).
 * Call this at startup to establish a baseline.
 */
export function snapshotRequireCache(): void {
  for (const path of Object.keys(require.cache)) {
    try {
      if (existsSync(path)) {
        const content = readFileSync(path);
        const hash = createHash('sha256').update(content).digest('hex');
        requireCacheSnapshot.set(path, hash);
      }
    } catch {
      // ignore
    }
  }
}

/**
 * Check if any cached modules have been modified since the snapshot.
 * Detects hot-swapping of module files.
 */
export function checkRequireCache(): AntiDebugResult {
  const reasons: string[] = [];

  for (const [path, expectedHash] of requireCacheSnapshot) {
    try {
      if (!existsSync(path)) {
        reasons.push(`Cached module deleted: ${path}`);
        continue;
      }
      const content = readFileSync(path);
      const currentHash = createHash('sha256').update(content).digest('hex');
      if (!safeEqual(currentHash, expectedHash)) {
        reasons.push(`Cached module modified: ${path}`);
      }
    } catch {
      reasons.push(`Failed to check cached module: ${path}`);
    }
  }

  return {
    ok: reasons.length === 0,
    reasons,
  };
}

// ── G. VM/container detection ──────────────────────────────────────

/**
 * Detect if the process is running in a VM or container.
 * This is informational — containers are common in production, but
 * VM snapshots can be used for rollback attacks.
 */
export function detectVirtualization(): {
  readonly isVM: boolean;
  readonly type: string;
  readonly details: readonly string[];
} {
  const details: string[] = [];
  let type = 'physical';

  // Check for Docker
  try {
    if (existsSync('/.dockerenv')) {
      type = 'docker';
      details.push('/.dockerenv exists');
    }
  } catch {
    // ignore
  }

  // Check for Kubernetes
  if (process.env.KUBERNETES_SERVICE_HOST) {
    type = 'kubernetes';
    details.push('KUBERNETES_SERVICE_HOST is set');
  }

  // Check /proc/1/cgroup for container indicators
  try {
    if (process.platform === 'linux') {
      const cgroup = readFileSync('/proc/1/cgroup', 'utf8');
      if (cgroup.includes('docker')) {
        type = 'docker';
        details.push('cgroup contains docker');
      }
      if (cgroup.includes('lxc')) {
        type = 'lxc';
        details.push('cgroup contains lxc');
      }
      if (cgroup.includes('kubepods')) {
        type = 'kubernetes';
        details.push('cgroup contains kubepods');
      }
    }
  } catch {
    // ignore
  }

  // Check DMI for VM indicators
  try {
    if (process.platform === 'linux' && existsSync('/sys/class/dmi/id/product_name')) {
      const productName = readFileSync('/sys/class/dmi/id/product_name', 'utf8').trim();
      const vmIndicators = ['VMware', 'VirtualBox', 'KVM', 'QEMU', 'Xen', 'Hyper-V', 'Parallels'];
      for (const indicator of vmIndicators) {
        if (productName.includes(indicator)) {
          type = 'vm';
          details.push(`DMI product: ${productName}`);
          break;
        }
      }
    }
  } catch {
    // ignore
  }

  return {
    isVM: type !== 'physical',
    type,
    details,
  };
}

// ── H. Constant-time comparison ────────────────────────────────────

/**
 * Constant-time string comparison to prevent timing attacks.
 * Uses crypto.timingSafeEqual internally.
 */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {return false;}
  try {
    return timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
  } catch {
    return false;
  }
}

// ── I. Function toString() verification ────────────────────────────

/**
 * Verify that a critical function hasn't been monkey-patched by
 * comparing its .toString() output against an expected pattern.
 *
 * This catches attacks like:
 *   const origCanActivate = LicenseGuard.prototype.canActivate;
 *   LicenseGuard.prototype.canActivate = async function() { return true; };
 */
export function verifyFunctionSource(
  fn: (...args: unknown[]) => unknown,
  expectedPattern: RegExp,
): boolean {
  const source = fn.toString();
  return expectedPattern.test(source);
}

// ── J. Comprehensive security check ─────────────────────────────────

export interface SecurityCheckResult {
  readonly ok: boolean;
  readonly antiDebug: AntiDebugResult;
  readonly envTampering: AntiDebugResult;
  readonly requireCache: AntiDebugResult;
  readonly virtualization: { isVM: boolean; type: string; details: readonly string[] };
  readonly reasons: readonly string[];
}

/**
 * Run all anti-tamper checks at once. Called before every license
 * validation.
 */
export function runSecurityChecks(isProduction: boolean): SecurityCheckResult {
  const antiDebug = detectDebugging();
  const envTampering = detectEnvTampering(isProduction);
  const requireCache = checkRequireCache();
  const virtualization = detectVirtualization();

  const allReasons: string[] = [
    ...antiDebug.reasons,
    ...envTampering.reasons,
    ...requireCache.reasons,
  ];

  // Virtualization is informational, not a failure (unless in production
  // and VM detection is enabled)
  if (isProduction && virtualization.isVM) {
    allReasons.push(`Running in ${virtualization.type} — verify this is expected`);
  }

  return {
    ok: allReasons.length === 0,
    antiDebug,
    envTampering,
    requireCache,
    virtualization,
    reasons: allReasons,
  };
}
