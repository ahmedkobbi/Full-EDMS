import { Prisma } from '@prisma/client';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { z } from 'zod';

const updateTenantSchema = z.object({
  name: z.string().min(1).max(256).optional(),
  defaultLocale: z.string().max(16).optional(),
  enabledLocales: z.array(z.string().max(16)).optional(),
  defaultTheme: z.enum(['system', 'light', 'dark']).optional(),
  flagConfig: z.record(z.string(), z.string()).optional(),
  branding: z.record(z.string(), z.unknown()).optional(),
  dataResidency: z.string().max(64).optional(),
  quotaUsers: z.number().int().min(1).optional(),
  quotaStorageBytes: z.bigint().optional(),
  quotaDocuments: z.number().int().min(1).optional(),
});

/**
 * Tenant management service. Admin-only mutations.
 * Spec ref: §9.2 (multi-tenancy and tenant configuration), §15.3 (tenant isolation).
 */
@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  async get(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });}
    return tenant;
  }

  async update(tenantId: string, raw: unknown) {
    const input = updateTenantSchema.parse(raw);
    return this.prisma.tenant.update({ where: { id: tenantId }, data: input as Prisma.TenantUpdateInput });
  }

  async getEnabledLocales(tenantId: string): Promise<string[]> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { enabledLocales: true, defaultLocale: true } });
    return tenant?.enabledLocales ?? ['en'];
  }
}
