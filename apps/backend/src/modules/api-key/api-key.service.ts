/**
 * API key management service (spec §9.15 — API key management).
 * API keys are shown ONCE on creation — only the hash is stored.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/audit.service';
import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';

const createApiKeySchema = z.object({
  name: z.string().min(1).max(128),
  scopes: z.array(z.string().max(64)).default([]),
  expiresAt: z.string().datetime().optional(),
});

@Injectable()
export class ApiKeyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(tenantId: string) {
    const keys = await this.prisma.apiKey.findMany({
      where: { tenantId },
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
    return keys;
  }

  async create(tenantId: string, userId: string, raw: unknown) {
    const input = createApiKeySchema.parse(raw);
    // Generate a random API key: sedms_<32 hex chars>
    const rawKey = `sedms_${randomBytes(24).toString('hex')}`;
    const keyHash = sha256(rawKey);
    const keyPrefix = rawKey.slice(0, 12); // sedms_XXXXX

    const apiKey = await this.prisma.apiKey.create({
      data: {
        tenantId,
        name: input.name,
        keyHash,
        keyPrefix,
        scopes: input.scopes,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        isActive: true,
        createdByUserId: userId,
      },
    });

    void this.audit.record({
      tenantId,
      userId,
      category: 'admin',
      code: 'api_key.create',
      result: 'allow',
      resourceType: 'api_key',
      resourceId: apiKey.id,
    });

    // Return the raw key ONCE — it will never be retrievable again
    return {
      id: apiKey.id,
      name: apiKey.name,
      key: rawKey, // ONLY returned on creation
      keyPrefix: apiKey.keyPrefix,
      scopes: apiKey.scopes,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
    };
  }

  async revoke(tenantId: string, userId: string, id: string) {
    await this.prisma.apiKey.updateMany({
      where: { id, tenantId },
      data: { isActive: false },
    });
    void this.audit.record({
      tenantId,
      userId,
      category: 'admin',
      code: 'api_key.revoke',
      result: 'allow',
      resourceType: 'api_key',
      resourceId: id,
    });
  }

  async delete(tenantId: string, userId: string, id: string) {
    await this.prisma.apiKey.deleteMany({ where: { id, tenantId } });
    void this.audit.record({
      tenantId,
      userId,
      category: 'admin',
      code: 'api_key.delete',
      result: 'allow',
      resourceType: 'api_key',
      resourceId: id,
    });
  }

  /**
   * Validate an API key (used by the ApiKeyGuard).
   * Returns the API key record if valid, null otherwise.
   */
  async validate(rawKey: string) {
    if (!rawKey.startsWith('sedms_')) {return null;}
    const keyHash = sha256(rawKey);
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { keyHash, isActive: true },
    });
    if (!apiKey) {return null;}
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {return null;}

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
