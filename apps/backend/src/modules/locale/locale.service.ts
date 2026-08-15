/**
 * Locale + translation management service (spec §9.15, §16 — locale management).
 * Manages tenant-specific translation overrides stored in the LocaleResource table.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { z } from 'zod';

const upsertOverrideSchema = z.object({
  locale: z.enum(['en', 'fr', 'ar', 'ru', 'zh-CN', 'de']),
  namespace: z.string().min(1).max(64),
  key: z.string().min(1).max(128),
  value: z.string().min(1).max(10000),
});

@Injectable()
export class LocaleService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all translation overrides for the tenant.
   */
  async listOverrides(tenantId: string, locale?: string) {
    return this.prisma.localeResource.findMany({
      where: {
        tenantId,
        ...(locale ? { locale } : {}),
      },
      orderBy: [{ locale: 'asc' }, { namespace: 'asc' }, { key: 'asc' }],
      take: 500,
    });
  }

  /**
   * Create or update a translation override.
   */
  async upsertOverride(tenantId: string, raw: unknown) {
    const input = upsertOverrideSchema.parse(raw);
    return this.prisma.localeResource.upsert({
      where: {
        tenantId_locale_namespace_key: {
          tenantId,
          locale: input.locale,
          namespace: input.namespace,
          key: input.key,
        },
      },
      create: {
        tenantId,
        ...input,
        isOverride: true,
      },
      update: {
        value: input.value,
      },
    });
  }

  /**
   * Delete a translation override (revert to bundled resource).
   */
  async deleteOverride(
    tenantId: string,
    locale: string,
    namespace: string,
    key: string,
  ) {
    await this.prisma.localeResource.deleteMany({
      where: { tenantId, locale, namespace, key },
    });
  }

  /**
   * Get all overrides for a specific locale (used by the frontend to merge
   * with bundled resources at runtime).
   */
  async getOverridesForLocale(tenantId: string, locale: string) {
    const overrides = await this.prisma.localeResource.findMany({
      where: { tenantId, locale },
    });
    // Group by namespace
    const grouped: Record<string, Record<string, string>> = {};
    for (const o of overrides) {
      if (!grouped[o.namespace]) grouped[o.namespace] = {};
      grouped[o.namespace][o.key] = o.value;
    }
    return grouped;
  }

  /**
   * Get enabled locales for the tenant.
   */
  async getEnabledLocales(tenantId: string): Promise<string[]> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { enabledLocales: true, defaultLocale: true },
    });
    return tenant?.enabledLocales ?? ['en'];
  }
}
