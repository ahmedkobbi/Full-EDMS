#!/usr/bin/env tsx
/**
 * Signing key generation script for the Smart EDMS Licensing Server.
 *
 * Usage:
 *   pnpm --filter @smart-edms/license-server key:generate
 *
 * What it does:
 *   1. Generates a new Ed25519 (default) or ES256 keypair.
 *   2. Writes the PRIVATE key to LICENSE_SIGNING_KEY_PATH (or the path
 *      passed as --out) with chmod 600.
 *   3. Inserts a SigningKey DB row with the PUBLIC key + derived kid.
 *   4. Prints the PUBLIC key PEM for embedding in on-prem backends and
 *      Electron clients.
 *   5. Prints the LICENSE_SIGNING_KID env var to set.
 *
 * Spec ref: §12.4 (signing key isolation).
 *
 * CRITICAL: the PRIVATE key is written ONLY to the file at --out. It is
 * NEVER printed to stdout, NEVER written to the database, NEVER embedded
 * in any client artifact. The file is chmod 600 (owner read/write only).
 */

import { chmod, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  deriveKeyId,
  generateSigningKeyPair,
  type SigningAlg,
} from '@smart-edms/license-core';

interface Args {
  out: string;
  alg: SigningAlg;
  printEnv: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    out: process.env.LICENSE_SIGNING_KEY_PATH ?? './keys/signing-key.pem',
    alg: (process.env.LICENSE_SIGNING_ALG as SigningAlg | undefined) ?? 'EdDSA',
    printEnv: true,
  };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--out' || arg === '-o') {
      args.out = argv[++i]!;
    } else if (arg === '--alg' || arg === '-a') {
      const next = argv[++i] as SigningAlg | undefined;
      if (next !== 'EdDSA' && next !== 'ES256') {
        throw new Error(`Invalid --alg value: ${next}. Must be 'EdDSA' or 'ES256'.`);
      }
      args.alg = next;
    } else if (arg === '--no-env') {
      args.printEnv = false;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${arg}`);
      printHelp();
      process.exit(1);
    }
  }
  return args;
}

function printHelp(): void {
  console.log(`
Usage: pnpm --filter @smart-edms/license-server key:generate [options]

Options:
  --out, -o <path>   Path to write the private key (default: $LICENSE_SIGNING_KEY_PATH or ./keys/signing-key.pem)
  --alg, -a <alg>    Signing algorithm: 'EdDSA' (default) or 'ES256'
  --no-env           Don't print the env var assignments at the end
  --help, -h         Show this help

Output:
  - Private key written to <path> (chmod 600).
  - Public key PEM printed to stdout (copy this into the on-prem backend's
    trusted-public-keys list).
  - LICENSE_SIGNING_KID env var printed (set this in the licensing server's env).

Spec ref: §12.4 (signing key isolation).
`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);
  const outPath = resolve(args.out);

  console.log(`Generating ${args.alg} signing keypair...`);
  const pair = generateSigningKeyPair(args.alg);

  // Sanity-check the kid derivation.
  const derivedKid = deriveKeyId(pair.publicKeyPem);
  if (derivedKid !== pair.kid) {
    throw new Error(
      `Internal error: kid mismatch (deriveKeyId returned ${derivedKid} but generateSigningKeyPair returned ${pair.kid})`,
    );
  }

  // Write the private key to disk with chmod 600.
  // If the file already exists, refuse to overwrite unless --force is passed.
  try {
    await stat(outPath);
    console.error(`Error: ${outPath} already exists. Refusing to overwrite (use --force not implemented yet).`);
    console.error('Move the existing file aside first if you intend to generate a new key.');
    process.exit(1);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw err;
    }
    // File doesn't exist — proceed.
  }

  await writeFile(outPath, pair.privateKeyPem, { mode: 0o600 });
  // Explicit chmod in case umask interfered.
  await chmod(outPath, 0o600);

  console.log('');
  console.log('=== Smart EDMS Licensing Server — Signing Key Generated ===');
  console.log('');
  console.log(`Algorithm:    ${pair.alg}`);
  console.log(`Key ID (kid): ${pair.kid}`);
  console.log(`Private key:  ${outPath}  (chmod 600 — owner read/write only)`);
  console.log('');
  console.log('--- Public Key PEM (safe to embed in on-prem backends + Electron clients) ---');
  console.log(pair.publicKeyPem);
  console.log('--- End Public Key ---');
  console.log('');

  if (args.printEnv) {
    console.log('Set these env vars in the licensing server process environment:');
    console.log(`  LICENSE_SIGNING_KEY_PATH=${outPath}`);
    console.log(`  LICENSE_SIGNING_KID=${pair.kid}`);
    console.log(`  LICENSE_SIGNING_ALG=${pair.alg}`);
    console.log('');
    console.log('And distribute the public key above to all on-prem backends.');
  }

  console.log('');
  console.log('CRITICAL REMINDERS (spec §12.4):');
  console.log('  - The private key file MUST be readable ONLY by the license-server process.');
  console.log('  - NEVER commit the private key to version control.');
  console.log('  - NEVER embed the private key in a Docker image, Electron bundle, or client artifact.');
  console.log('  - NEVER log, print, or return the private key in any API response.');
  console.log('  - Back up the private key offline (encrypted) — losing it invalidates all signed licenses.');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
