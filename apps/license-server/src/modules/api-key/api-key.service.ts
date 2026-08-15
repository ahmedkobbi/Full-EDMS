/**
 * API Key management service (spec §12.1 — ApiKey entity).
 *
 * Manages API keys for programmatic access to the licensing server
 * (used by on-premise backends for activation + heartbeat).
 *
 * API keys are shown ONCE on creation — only the hash is stored.
 *
 * Spec ref: §12.1 (ApiKey entity), §12.10 (API key management in admin panel).
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';

const createKeySchema = z.object({
  name: z.string().min(1).max(128),
  scopes: z.array(z.string().max(64)).default(['activate', 'heartbeat']),
  expiresAt: z.string().datetime().optional(),
});

@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list() {
    return this.prisma.apiKey.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  }

  async create(adminId: string, raw: unknown) {
    const input = createKeySchema.parse(raw);
    const rawKey = `sedms_${randomBytes(24).toString('hex')}`;
    const keyHash = sha256(rawKey);
    const keyPrefix = rawKey.slice(0, 12);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        name: input.name,
        keyHash,
        keyPrefix,
        scopes: input.scopes,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        isActive: true,
      },
    });

    await this.audit.record({
      adminId,
      action: 'api_key.create',
      target: 'api_key',
      targetId: apiKey.id,
      result: 'allow',
      metadata: { name: input.name, scopes: input.scopes },
    });

    return {
      id: apiKey.id,
      name: apiKey.name,
      key: rawKey,
      keyPrefix: apiKey.keyPrefix,
      scopes: apiKey.scopes,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
    };
  }

  async revoke(id: string, adminId: string): Promise<void> {
    const key = await this.prisma.apiKey.findUnique({ where: { id } });
    if (!key) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });
    await this.prisma.apiKey.update({
      where: { id },
      data: { isActive: false },
    });
    await this.audit.record({
      adminId,
      action: 'api_key.revoke',
      target: 'api_key',
      targetId: id,
      result: 'allow',
    });
  }

  async delete(id: string, adminId: string): Promise<void> {
    const key = await this.prisma.apiKey.findUnique({ where: { id } });
    if (!key) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });
    await this.prisma.apiKey.delete({ where: { id } });
    await this.audit.record({
      adminId,
      action: 'api_key.delete',
      target: 'api_key',
      targetId: id,
      result: 'allow',
    });
  }

  /**
   * Validate an API key (used by ApiKeyGuard).
   */
  async validate(rawKey: string) {
    if (!rawKey.startsWith('sedms_')) return null;
    const keyHash = sha256(rawKey);
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { keyHash, isActive: true },
    });
    if (!apiKey) return null;
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

    // Update lastUsedAt (fire-and-forget)
    void this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return apiKey;
  }
}

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}
