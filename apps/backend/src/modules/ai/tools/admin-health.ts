/**
 * AI tool: `admin.getHealth` (spec §11.5).
 *
 * Returns a coarse health snapshot for the platform: database, Redis,
 * storage, search, license state. NEVER includes connection strings, host
 * names, ports, or credentials. Admin-only.
 */

import type { z } from 'zod';
import { AdminGetHealthInputSchema } from '@smart-edms/schemas';
import type { ToolDefinition, ToolResult } from '../tool-catalog.js';

interface AdminGetHealthOutput {
  readonly status: 'ok' | 'degraded' | 'down';
  readonly licenseState: string;
  readonly components: ReadonlyArray<{
    readonly name: string;
    readonly status: 'ok' | 'degraded' | 'down';
  }>;
  readonly checkedAt: string;
}

export const adminHealthTool: ToolDefinition<
  z.infer<typeof AdminGetHealthInputSchema>,
  AdminGetHealthOutput
> = {
  name: 'admin.getHealth',
  descriptionKey: 'ai.tools.admin.getHealth.description',
  requiredPermission: 'admin:read',
  requiredLicenseModule: 'core-edms',
  mutates: false,
  rateLimitPerMinute: 5,
  inputSchema: {
    type: 'object',
    properties: { includeDependencies: { type: 'boolean', default: true } },
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['ok', 'degraded', 'down'] },
      licenseState: { type: 'string' },
      components: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            status: { type: 'string', enum: ['ok', 'degraded', 'down'] },
          },
        },
      },
      checkedAt: { type: 'string', format: 'date-time' },
    },
  },
  inputZod: AdminGetHealthInputSchema,
  async execute(input, ctx): Promise<ToolResult<AdminGetHealthOutput>> {
    // Defense-in-depth: even though `isToolAuthorized` checks `admin:read`,
    // we re-check the role here.
    if (!ctx.roles.includes('admin')) {
      return { ok: false, reasonKey: 'errors.FORBIDDEN', status: 'denied' };
    }

    const components: Array<{ name: string; status: 'ok' | 'degraded' | 'down' }> = [];

    // Database — ping Prisma.
    try {
      await ctx.prisma.$queryRaw`SELECT 1`;
      components.push({ name: 'database', status: 'ok' });
    } catch {
      components.push({ name: 'database', status: 'down' });
    }

    // Redis — ping.
    try {
      const pong = await ctx.redis.connection.ping();
      components.push({ name: 'redis', status: pong === 'PONG' ? 'ok' : 'degraded' });
    } catch {
      components.push({ name: 'redis', status: 'down' });
    }

    // License state.
    let licenseState = 'unknown';
    try {
      licenseState = await ctx.license.getCurrentState();
      components.push({
        name: 'license',
        status: licenseState === 'valid' || licenseState === 'expiring_soon' ? 'ok' : 'degraded',
      });
    } catch {
      components.push({ name: 'license', status: 'down' });
    }

    if (input.includeDependencies) {
      // Storage + search dependencies — we don't have direct access here,
      // so we mark them as `degraded` (informational only). When the
      // corresponding services are wired in, replace these with real pings.
      components.push({ name: 'storage', status: 'degraded' });
      components.push({ name: 'search', status: 'degraded' });
    }

    const overall: 'ok' | 'degraded' | 'down' = components.some((c) => c.status === 'down')
      ? 'down'
      : components.some((c) => c.status === 'degraded')
        ? 'degraded'
        : 'ok';

    return {
      ok: true,
      output: {
        status: overall,
        licenseState,
        components,
        checkedAt: new Date().toISOString(),
      },
    };
  },
};
