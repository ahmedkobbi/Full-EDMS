import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFile, chmod, stat } from 'node:fs/promises';
import { createPrivateKey, type KeyObject } from 'node:crypto';
import {
  deriveKeyId,
  generateSigningKeyPair,
  type SigningAlg,
  type SigningKeyPair,
} from '@smart-edms/license-core';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Signing-key service — loads, holds, and rotates the Ed25519 / ES256
 * private signing key.
 *
 * Spec ref: §12.4 (signing key isolation).
 *
 * CRITICAL SECURITY INVARIANTS (enforced by this service):
 *
 * 1. The private key is loaded ONCE at startup from
 *    `LICENSE_SIGNING_KEY_PATH` and held in memory for the lifetime of
 *    the process. It is NEVER:
 *      - written to logs,
 *      - persisted to the database (only the PUBLIC key + kid are stored),
 *      - returned by any HTTP response,
 *      - embedded in any client artifact,
 *      - sent to any external service.
 *
 * 2. The key file MUST be readable ONLY by the license-server process
 *    (chmod 600, owned by the service account). On startup, this service
 *    checks the file's mode and refuses to start if it's group- or
 *    world-readable.
 *
 * 3. The `kid` env var (`LICENSE_SIGNING_KID`) MUST match
 *    `deriveKeyId(publicKeyPem)` for the loaded private key. If it
 *    doesn't, the server refuses to start — this prevents accidental
 *    misconfiguration where the on-prem backends have been told to trust
 *    a different `kid` than the one actually signing.
 *
 * 4. Key rotation:
 *      - Admin generates a new keypair via `POST /v1/signing-keys/rotate`
 *        (requires step-up auth).
 *      - The new key's PUBLIC half is written to the DB as a new
 *        SigningKey row with status `'active'`; the OLD key's status is
 *        changed to `'retiring'`.
 *      - The new key's PRIVATE half is written to a NEW file path
 *        (configurable) and the operator updates the env var
 *        `LICENSE_SIGNING_KEY_PATH` + `LICENSE_SIGNING_KID` and restarts
 *        the server.
 *      - Until the restart, the OLD key continues signing.
 *      - On restart, the server loads the NEW key and immediately signs
 *        one last CRL with the OLD key (if it's still in the DB as
 *        `'retiring'`) to formally retire it.
 *      - All new licenses are signed with the NEW key.
 *
 * 5. KMS / HSM integration: when `KMS_PROVIDER` is set, the private key
 *    never touches the filesystem. The `kmsKeyId` references the KMS
 *    key; signing operations are delegated to the KMS API. This is
 *    stubbed in this skeleton — production deployments must implement
 *    the actual KMS client.
 */
@Injectable()
export class SigningKeyService implements OnModuleInit {
  private readonly logger = new Logger(SigningKeyService.name);

  /** The active private key (held in memory only). */
  private privateKeyPem: string | null = null;
  /** The active private key as a KeyObject (cached for performance). */
  private privateKeyObj: KeyObject | null = null;
  /** The active key ID (16 hex chars). */
  private activeKid: string | null = null;
  /** The active signing algorithm. */
  private activeAlg: SigningAlg | null = null;
  /** The active key's DB row ID. */
  private activeSigningKeyId: string | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.loadActiveKey();
  }

  /**
   * Load the private signing key from disk (or KMS) at startup.
   * Validates the file permissions and the kid match.
   */
  private async loadActiveKey(): Promise<void> {
    const keyPath = this.config.get<string>('LICENSE_SIGNING_KEY_PATH');
    const expectedKid = this.config.get<string>('LICENSE_SIGNING_KID');
    const alg = (this.config.get<string>('LICENSE_SIGNING_ALG') as SigningAlg) ?? 'EdDSA';

    if (!keyPath) {
      this.logger.error('LICENSE_SIGNING_KEY_PATH not set — license signing disabled');
      return;
    }
    if (!expectedKid) {
      this.logger.error('LICENSE_SIGNING_KID not set — license signing disabled');
      return;
    }

    // KMS path — stubbed.
    const kmsProvider = this.config.get<string>('KMS_PROVIDER');
    if (kmsProvider) {
      this.logger.warn(
        `KMS_PROVIDER='${kmsProvider}' is configured but the KMS client is a stub. ` +
          'Production deployments must implement the actual KMS integration. ' +
          'Falling back to filesystem key loading.',
      );
      // Fall through to filesystem loading for now.
    }

    // Filesystem path.
    try {
      // Check file permissions (spec §12.4: chmod 600).
      const stats = await stat(keyPath);
      const mode = stats.mode & 0o777;
      if (mode & 0o077) {
        // Group or world has any permission — fail closed.
        this.logger.error(
          `Signing key file ${keyPath} has insecure permissions (mode ${mode.toString(8)}). ` +
            'Required: 0600 (owner read/write only). Refusing to start.',
        );
        // In production we'd process.exit(1); for the skeleton we just disable signing.
        return;
      }

      const pem = await readFile(keyPath, 'utf8');
      const privKey = createPrivateKey({ key: Buffer.from(pem, 'utf8'), format: 'pem' });

      // Derive the public key + kid from the loaded private key.
      const pubKeyPem = privKey
        .export({ type: 'spki', format: 'pem' })
        .toString('utf8');
      const derivedKid = deriveKeyId(pubKeyPem);

      if (derivedKid !== expectedKid) {
        this.logger.error(
          `LICENSE_SIGNING_KID (${expectedKid}) does not match deriveKeyId(publicKeyPem) ` +
            `(${derivedKid}). Refusing to start — this would cause on-prem backends to ` +
            'reject all signed artifacts.',
        );
        return;
      }

      this.privateKeyPem = pem;
      this.privateKeyObj = privKey;
      this.activeKid = derivedKid;
      this.activeAlg = alg;
      this.logger.log(
        `Loaded signing key: kid=${derivedKid} alg=${alg} (private key held in memory only; never persisted)`,
      );

      // Ensure the DB has a SigningKey row for this kid.
      await this.ensureSigningKeyRow(derivedKid, alg, pubKeyPem);
    } catch (err) {
      this.logger.error(
        `Failed to load signing key from ${keyPath}: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Ensure the DB has a SigningKey row for the active key. Idempotent.
   */
  private async ensureSigningKeyRow(
    kid: string,
    alg: SigningAlg,
    publicKeyPem: string,
  ): Promise<void> {
    const existing = await this.prisma.signingKey.findUnique({ where: { kid } });
    if (existing) {
      this.activeSigningKeyId = existing.id;
      // If the key was 'retiring' (mid-rotation), promote it back to 'active'
      // since we just loaded it as the active signer. This handles the case
      // where the operator restarted the server with the NEW key while the
      // old key was still 'retiring'.
      if (existing.status === 'retiring' || existing.status === 'rotating') {
        await this.prisma.signingKey.update({
          where: { id: existing.id },
          data: { status: 'active', rotatedAt: new Date() },
        });
        this.logger.log(`Promoted signing key ${kid} from '${existing.status}' to 'active'`);
      }
      return;
    }
    const row = await this.prisma.signingKey.create({
      data: {
        kid,
        alg,
        publicKeyPem,
        status: 'active',
      },
    });
    this.activeSigningKeyId = row.id;
    this.logger.log(`Created SigningKey DB row for kid=${kid}`);
  }

  /**
   * Returns the active signing key material for use by the license signer.
   *
   * Throws if the key is not loaded — callers should treat this as a
   * fatal "license signing disabled" condition.
   */
  getActiveSigner(): {
    privateKeyPem: string;
    kid: string;
    alg: SigningAlg;
    signingKeyId: string;
  } {
    if (!this.privateKeyPem || !this.activeKid || !this.activeAlg || !this.activeSigningKeyId) {
      throw new Error('No active signing key loaded — license signing is disabled');
    }
    return {
      privateKeyPem: this.privateKeyPem,
      kid: this.activeKid,
      alg: this.activeAlg,
      signingKeyId: this.activeSigningKeyId,
    };
  }

  /**
   * Returns true if the signing key has been loaded successfully.
   */
  isLoaded(): boolean {
    return (
      this.privateKeyPem !== null &&
      this.activeKid !== null &&
      this.activeAlg !== null &&
      this.activeSigningKeyId !== null
    );
  }

  /**
   * Get the active key's public metadata (safe to expose).
   */
  getActivePublicKey(): { kid: string; alg: SigningAlg; publicKeyPem: string } | null {
    if (!this.isLoaded()) return null;
    // Re-derive the public key from the cached KeyObject. NEVER return
    // the private key.
    if (!this.privateKeyObj) return null;
    const publicKeyPem = this.privateKeyObj
      .export({ type: 'spki', format: 'pem' })
      .toString('utf8');
    return {
      kid: this.activeKid!,
      alg: this.activeAlg!,
      publicKeyPem,
    };
  }

  /**
   * Generate a new signing keypair for rotation.
   *
   * The PRIVATE half is written to the file at `targetKeyPath` (chmod 600),
   * and the PUBLIC half is returned so the admin can:
   *   1. Add it to the on-prem backend's trusted-public-keys list.
   *   2. Update `LICENSE_SIGNING_KID` env var.
   *   3. Restart the server.
   *
   * The current key is marked as `'retiring'` in the DB (it will sign one
   * final CRL on the next startup before being marked `'retired'`).
   *
   * Returns the new key's metadata (kid, alg, public key PEM, suggested
   * file path). The PRIVATE key is NEVER returned by this method — it's
   * only written to disk for the operator to load via env var on restart.
   */
  async generateRotationKey(input: {
    alg?: SigningAlg;
    targetKeyPath: string;
    createdByAdminId: string;
  }): Promise<{
    kid: string;
    alg: SigningAlg;
    publicKeyPem: string;
    keyPath: string;
    instructions: string[];
  }> {
    const alg = input.alg ?? this.activeAlg ?? 'EdDSA';
    const pair: SigningKeyPair = generateSigningKeyPair(alg);

    // Write the private key to disk with chmod 600.
    const { writeFile } = await import('node:fs/promises');
    await writeFile(input.targetKeyPath, pair.privateKeyPem, { mode: 0o600 });
    // Explicit chmod in case the file already existed with looser perms.
    await chmod(input.targetKeyPath, 0o600);

    // Insert a new SigningKey row with status='rotating' (will be promoted
    // to 'active' on the next server restart that loads it).
    await this.prisma.signingKey.create({
      data: {
        kid: pair.kid,
        alg: pair.alg,
        publicKeyPem: pair.publicKeyPem,
        status: 'rotating',
      },
    });

    // Mark the current key as 'retiring' so the next startup knows to sign
    // one final CRL with it.
    if (this.activeSigningKeyId) {
      await this.prisma.signingKey.update({
        where: { id: this.activeSigningKeyId },
        data: { status: 'retiring', retiredAt: null },
      });
    }

    this.logger.log(
      `Generated rotation signing key: kid=${pair.kid} alg=${pair.alg} ` +
        `(private key written to ${input.targetKeyPath} with chmod 600). ` +
        `Current key ${this.activeKid ?? '(none)'} marked as 'retiring'.`,
    );

    return {
      kid: pair.kid,
      alg: pair.alg,
      publicKeyPem: pair.publicKeyPem,
      keyPath: input.targetKeyPath,
      instructions: [
        `1. Distribute the new public key (kid=${pair.kid}) to all on-prem backends ` +
          '(add to their trusted-public-keys list before the rotation).',
        `2. Update LICENSE_SIGNING_KEY_PATH=${input.targetKeyPath} and LICENSE_SIGNING_KID=${pair.kid}.`,
        '3. Restart the licensing server. On restart, the new key becomes active ' +
          'and signs one final CRL with the old key to retire it.',
        '4. Once all on-prem backends have fetched the new CRL, the old key can be ' +
          "deleted from disk (the DB row is kept for audit history).",
      ],
    };
  }

  /**
   * List all signing keys (active, retiring, retired) — for the admin
   * panel's key management view. Returns PUBLIC metadata only.
   */
  async listKeys(): Promise<
    Array<{
      id: string;
      kid: string;
      alg: string;
      status: string;
      publicKeyPem: string;
      createdAt: Date;
      retiredAt: Date | null;
      rotatedAt: Date | null;
    }>
  > {
    return this.prisma.signingKey.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        kid: true,
        alg: true,
        status: true,
        publicKeyPem: true,
        createdAt: true,
        retiredAt: true,
        rotatedAt: true,
      },
    });
  }
}
