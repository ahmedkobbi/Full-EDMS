/**
 * AI tool: `license.getStatus` (spec §11.5).
 *
 * Returns the current license state, expiry, and entitled modules. NO
 * cryptographic material (key ids, signatures, fingerprints) is ever
 * returned to the model — only the human-readable state.
 */

import type { z } from 'zod';
import { LicenseGetStatusInputSchema } from '@smart-edms/schemas';
import type { ToolDefinition, ToolResult } from '../tool-catalog.js';

interface LicenseGetStatusOutput {
  readonly state: string;
  readonly environment: string | null;
  readonly expiresAt: string | null;
  readonly issuedAt: string | null;
  readonly entitledModules: readonly string[];
  readonly aiEntitlements: readonly string[];
  readonly deploymentId: string | null;
}

export const licenseStatusTool: ToolDefinition<
  z.infer<typeof LicenseGetStatusInputSchema>,
  LicenseGetStatusOutput
> = {
  name: 'license.getStatus',
  descriptionKey: 'ai.tools.license.getStatus.description',
  requiredPermission: 'license:read',
  requiredLicenseModule: 'core-edms',
  mutates: false,
  rateLimitPerMinute: 10,
  inputSchema: {
    type: 'object',
    properties: {
      includeEntitlements: { type: 'boolean', default: true },
      includeUsage: { type: 'boolean', default: false },
    },
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      state: { type: 'string' },
      environment: { type: 'string', nullable: true },
      expiresAt: { type: 'string', format: 'date-time', nullable: true },
      issuedAt: { type: 'string', format: 'date-time', nullable: true },
      entitledModules: { type: 'array', items: { type: 'string' } },
      aiEntitlements: { type: 'array', items: { type: 'string' } },
      deploymentId: { type: 'string', nullable: true },
    },
  },
  inputZod: LicenseGetStatusInputSchema,
  async execute(input, ctx): Promise<ToolResult<LicenseGetStatusOutput>> {
    try {
      const active = await ctx.license.getActivePayload();
      const state = await ctx.license.getCurrentState();

      if (!active) {
        return {
          ok: true,
          output: {
            state,
            environment: null,
            expiresAt: null,
            issuedAt: null,
            entitledModules: [],
            aiEntitlements: [],
            deploymentId: null,
          },
        };
      }

      const p = active.payload;
      return {
        ok: true,
        output: {
          state,
          environment: p.environment,
          expiresAt: p.expiresAt,
          issuedAt: p.issuedAt,
          entitledModules: input.includeEntitlements ? p.entitlements : [],
          aiEntitlements: input.includeEntitlements ? p.aiEntitlements : [],
          deploymentId: p.deploymentId,
        },
      };
    } catch (err) {
      void ctx.audit.record({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        category: 'ai_assistant',
        code: 'ai.tool_invoked',
        result: 'deny',
        reason: `license.getStatus:${(err as Error).message.slice(0, 200)}`,
        correlationId: ctx.requestId,
      });
      return { ok: false, reasonKey: 'ai.errors.toolFailed', status: 'failed' };
    }
  },
};
