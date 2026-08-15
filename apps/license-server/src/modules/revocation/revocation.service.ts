import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SigningKeyService } from '../signing-key/signing-key.service.js';
import {
  buildRevocationList,
  serializeSedmscrl,
  type SigningAlg,
} from '@smart-edms/license-core';
import type { RevocationList } from '@smart-edms/types';

/**
 * Revocation list (`.sedmscrl`) builder + signer.
 *
 * Spec ref: §12.4 (CRL semantics).
 *
 * The CRL is a small JSON document listing license IDs and device
 * fingerprints that have been revoked. The on-prem backend fetches it
 * when online and consults it during every license signature verification.
 *
 * The CRL is signed with the active signing key. During key rotation,
 * one final CRL is signed with the retiring key to formally retire it.
 *
 * A new CRL is generated:
 *   - immediately on every revocation,
 *   - on a scheduled cron (every CRL_REFRESH_HOURS hours),
 *   - on demand via the admin endpoint `POST /v1/revocations/refresh`.
 */
@Injectable()
export class RevocationService {
  private readonly logger = new Logger(RevocationService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly signingKey: SigningKeyService,
  ) {}

  /**
   * Build + sign the current CRL. Returns the serialized `.sedmscrl`
   * content + the structured `RevocationList` for storage.
   */
  async buildAndSign(): Promise<{
    crl: RevocationList;
    content: string;
    version: number;
    kid: string;
    alg: SigningAlg;
  }> {
    // Gather all active revocations.
    const revocations = await this.prisma.revocation.findMany({
      where: {},
      select: { licenseId: true, fingerprint: true, crlVersion: true },
    });
    const revokedLicenseIds: string[] = Array.from(
      new Set(revocations.map((r: { licenseId: string }) => r.licenseId)),
    );
    const revokedFingerprints: string[] = Array.from(
      new Set(
        revocations.flatMap(
          (r: { fingerprint: string | null }) => (r.fingerprint ? [r.fingerprint] : []),
        ),
      ),
    );

    const latestVersion = revocations.reduce(
      (max: number, r: { crlVersion: number }) => Math.max(max, r.crlVersion),
      0,
    );

    const now = new Date();
    const ttlHours = this.config.get<number>('CRL_TTL_HOURS') ?? 24;
    const nextExpectedAt = new Date(now.getTime() + ttlHours * 86_400_000 / 24);

    const signer = this.signingKey.getActiveSigner();
    const crl = buildRevocationList(
      {
        revokedLicenseIds: revokedLicenseIds as never,
        revokedFingerprints,
        generatedAt: now.toISOString() as never,
        nextExpectedAt: nextExpectedAt.toISOString() as never,
      },
      signer.privateKeyPem,
      signer.kid,
      signer.alg,
    );
    const content = serializeSedmscrl(crl);

    this.logger.log(
      `Built + signed CRL: version=${latestVersion} revokedLicenses=${revokedLicenseIds.length} ` +
        `revokedFingerprints=${revokedFingerprints.length} kid=${signer.kid}`,
    );

    return {
      crl,
      content,
      version: latestVersion,
      kid: signer.kid,
      alg: signer.alg,
    };
  }

  /**
   * Get the latest CRL (cached). Public endpoint — the on-prem backend
   * fetches this periodically.
   *
   * If no CRL has been generated yet (server just started, no
   * revocations), generates one on demand.
   */
  async getLatest(): Promise<{ content: string; version: number; generatedAt: string }> {
    const result = await this.buildAndSign();
    return {
      content: result.content,
      version: result.version,
      generatedAt: result.crl.generatedAt,
    };
  }

  /**
   * Mark all revocations as propagated (after a CRL has been published).
   */
  async markPropagated(version: number): Promise<void> {
    await this.prisma.revocation.updateMany({
      where: { crlVersion: { lte: version }, propagated: false },
      data: { propagated: true },
    });
  }
}
