/**
 * AI tool: `tour.start` (spec §11.5, §10).
 *
 * Returns a SUGGESTED `launch_tour` action. The server NEVER starts the tour
 * on the user's behalf — that is a client-side concern. The AI service
 * persists the suggestion as an {@link AssistantAction} with
 * `confirmationRequired: false` (launching a tour is non-destructive) and
 * `destructive: false`.
 */

import type { z } from 'zod';
import { TourStartInputSchema } from '@smart-edms/schemas';
import type { ToolDefinition, ToolResult } from '../tool-catalog.js';

interface TourStartOutput {
  readonly tourCode: string;
  readonly action: 'launch_tour';
  readonly labelKey: string;
}

export const tourStartTool: ToolDefinition<
  z.infer<typeof TourStartInputSchema>,
  TourStartOutput
> = {
  name: 'tour.start',
  descriptionKey: 'ai.tools.tour.start.description',
  requiredPermission: 'tour:read',
  requiredLicenseModule: 'guided-tour-analytics',
  mutates: false,
  rateLimitPerMinute: 10,
  inputSchema: {
    type: 'object',
    properties: {
      tourCode: {
        type: 'string',
        enum: [
          'welcome', 'documents', 'search', 'records_manager',
          'security_officer', 'auditor', 'administrator', 'workflow_designer',
          'scanner', 'license', 'realtime_collaboration', 'ai_assistant',
          'empty_state_learning', 'marketing_public',
        ],
      },
    },
    required: ['tourCode'],
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      tourCode: { type: 'string' },
      action: { type: 'string', enum: ['launch_tour'] },
      labelKey: { type: 'string' },
    },
  },
  inputZod: TourStartInputSchema,
  async execute(input, ctx): Promise<ToolResult<TourStartOutput>> {
    // Look up the tour definition (tenant-scoped). If it doesn't exist or
    // isn't enabled, we still return the suggestion — the client will show
    // a graceful "tour not available" message.
    try {
      const tour = await ctx.prisma.tourDefinition.findFirst({
        where: { tenantId: ctx.tenantId, code: input.tourCode, enabled: true },
        select: { id: true, code: true, module: true },
      });
      const labelKey = tour
        ? `tour.${tour.code}.title`
        : 'ai.actions.launchTour.unavailable';

      return {
        ok: true,
        output: {
          tourCode: input.tourCode,
          action: 'launch_tour',
          labelKey,
        },
        suggestedActions: [
          {
            actionType: 'launch_tour',
            targetType: 'tour',
            targetId: tour?.id ?? null,
            labelKey,
            confirmationRequired: false,
            destructive: false,
          },
        ],
      };
    } catch (err) {
      void ctx.audit.record({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        category: 'ai_assistant',
        code: 'ai.tool_invoked',
        result: 'deny',
        reason: `tour.start:${(err as Error).message.slice(0, 200)}`,
        correlationId: ctx.requestId,
      });
      return { ok: false, reasonKey: 'ai.errors.toolFailed', status: 'failed' };
    }
  },
};
