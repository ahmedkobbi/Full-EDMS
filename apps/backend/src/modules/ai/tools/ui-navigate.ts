/**
 * AI tool: `ui.navigateTo` (spec §11.5, §11.4).
 *
 * Returns a SUGGESTED navigation action. The server NEVER executes
 * navigation — that is a client-side concern. The AI service persists the
 * suggestion as an {@link AssistantAction} with `confirmationRequired: false`
 * (navigation is non-destructive) and `destructive: false`.
 *
 * The action payload tells the client which route to navigate to and which
 * query params to set. The client renders a "Go to …" affordance in the
 * assistant bubble.
 */

import type { z } from 'zod';
import { UiNavigateToInputSchema } from '@smart-edms/schemas';
import type { ToolDefinition, ToolResult } from '../tool-catalog.js';

interface UiNavigateToOutput {
  readonly action: 'navigate';
  readonly route: string;
  readonly params: Readonly<Record<string, string | number | boolean>>;
  readonly labelKey: string;
}

// Allowlist of routes the AI may suggest navigating to. Any other route is
// rejected with `errors.VALIDATION_FAILED`. This prevents the AI from
// suggesting deep links into admin-only or tenant-crossing routes.
const ALLOWED_ROUTE_PREFIXES: readonly string[] = [
  '/documents',
  '/search',
  '/workflow',
  '/workflows',
  '/retention',
  '/legal-hold',
  '/legal-holds',
  '/audit',
  '/classification',
  '/share',
  '/shares',
  '/notifications',
  '/scanner',
  '/tour',
  '/tours',
  '/license',
  '/settings',
  '/profile',
  '/help',
  '/dashboard',
];

function isAllowedRoute(route: string): boolean {
  if (!route.startsWith('/')) return false;
  // Strip query/hash for the prefix check.
  const path = route.split(/[?#]/)[0]!;
  return ALLOWED_ROUTE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export const uiNavigateTool: ToolDefinition<
  z.infer<typeof UiNavigateToInputSchema>,
  UiNavigateToOutput
> = {
  name: 'ui.navigateTo',
  descriptionKey: 'ai.tools.ui.navigateTo.description',
  requiredPermission: 'ui:navigate',
  requiredLicenseModule: 'core-edms',
  mutates: false,
  rateLimitPerMinute: 30,
  inputSchema: {
    type: 'object',
    properties: {
      route: { type: 'string', minLength: 1, maxLength: 256 },
      params: {
        type: 'object',
        additionalProperties: { type: ['string', 'number', 'boolean'] },
      },
    },
    required: ['route'],
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['navigate'] },
      route: { type: 'string' },
      params: { type: 'object' },
      labelKey: { type: 'string' },
    },
  },
  inputZod: UiNavigateToInputSchema,
  async execute(input, _ctx): Promise<ToolResult<UiNavigateToOutput>> {
    if (!isAllowedRoute(input.route)) {
      return {
        ok: false,
        reasonKey: 'errors.VALIDATION_FAILED',
        status: 'denied',
      };
    }
    return {
      ok: true,
      output: {
        action: 'navigate',
        route: input.route,
        params: input.params ?? {},
        labelKey: 'ai.actions.navigate',
      },
      suggestedActions: [
        {
          actionType: 'navigate',
          targetType: 'admin_page',
          targetId: null,
          labelKey: 'ai.actions.navigate',
          confirmationRequired: false,
          destructive: false,
        },
      ],
    };
  },
};
