/**
 * AI tool: `help.searchDocumentation` (spec §11.5).
 *
 * Searches the bundled i18n help namespaces for keys matching the user's
 * query. Returns the matching keys + the localised text snippet in the
 * user's locale (or English fallback).
 *
 * Implementation detail: the @smart-edms/i18n package bundles ALL 41
 * namespaces for ALL 6 locales. We import them statically (no runtime
 * fetch) and walk the object tree once per query, scoring each key by
 * simple substring match (case-insensitive).
 */

import type { z } from 'zod';
import { HelpSearchDocumentationInputSchema } from '@smart-edms/schemas';
import { en, fr, ar, ru, zhCN, de } from '@smart-edms/i18n';
import type { ToolDefinition, ToolResult } from '../tool-catalog';

interface HelpSearchDocumentationOutput {
  readonly results: ReadonlyArray<{
    readonly key: string;
    readonly namespace: string;
    /** Localised text snippet (max 400 chars). */
    readonly snippet: string;
    readonly locale: string;
  }>;
  readonly total: number;
}

/** Per-locale bundle map. The keys are dotted namespace paths. */
const BUNDLES: Readonly<Record<string, Record<string, unknown>>> = {
  en,
  fr,
  ar,
  ru,
  'zh-CN': zhCN,
  de,
};

/**
 * Flatten a nested locale bundle into a flat map of `namespace.path → value`.
 * Each value is a string (we skip non-leaf / object nodes).
 */
function flattenBundle(bundle: Record<string, unknown>): Array<{ key: string; value: string }> {
  const out: Array<{ key: string; value: string }> = [];
  const walk = (node: unknown, prefix: string): void => {
    if (typeof node === 'string') {
      out.push({ key: prefix, value: node });
      return;
    }
    if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        walk(v, prefix ? `${prefix}.${k}` : k);
      }
    }
  };
  walk(bundle, '');
  return out;
}

// Pre-compute the flattened English bundle once (module load).
const EN_FLAT = flattenBundle(en as Record<string, unknown>);

export const helpSearchTool: ToolDefinition<
  z.infer<typeof HelpSearchDocumentationInputSchema>,
  HelpSearchDocumentationOutput
> = {
  name: 'help.searchDocumentation',
  descriptionKey: 'ai.tools.help.searchDocumentation.description',
  requiredPermission: 'help:read',
  requiredLicenseModule: 'core-edms',
  mutates: false,
  rateLimitPerMinute: 30,
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', minLength: 1, maxLength: 512 },
      locale: { type: 'string', enum: ['en', 'fr', 'ar', 'ru', 'zh-CN', 'de'] },
      limit: { type: 'integer', minimum: 1, maximum: 10, default: 5 },
    },
    required: ['query'],
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      results: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            key: { type: 'string' },
            namespace: { type: 'string' },
            snippet: { type: 'string' },
            locale: { type: 'string' },
          },
        },
      },
      total: { type: 'integer' },
    },
  },
  inputZod: HelpSearchDocumentationInputSchema,
  async execute(input, ctx): Promise<ToolResult<HelpSearchDocumentationOutput>> {
    try {
      const locale = input.locale ?? ctx.locale ?? 'en';
      const bundle = BUNDLES[locale] ?? BUNDLES['en']!;
      const flat = locale === 'en' ? EN_FLAT : flattenBundle(bundle as Record<string, unknown>);

      const needle = input.query.toLowerCase();
      // Score each key by:
      //   - exact substring match in value (highest score)
      //   - substring match in key (lower score)
      const scored: Array<{ key: string; snippet: string; score: number; namespace: string }> = [];
      for (const { key, value } of flat) {
        const valueLower = value.toLowerCase();
        let score = 0;
        if (valueLower.includes(needle)) score += 100;
        if (key.toLowerCase().includes(needle)) score += 10;
        // Light keyword bonus — every word in the needle that appears in the value
        for (const word of needle.split(/\s+/).filter((w) => w.length > 2)) {
          if (valueLower.includes(word)) score += 5;
        }
        if (score > 0) {
          // Extract a 400-char snippet around the first match.
          const idx = valueLower.indexOf(needle);
          const start = idx >= 0 ? Math.max(0, idx - 80) : 0;
          const snippet = value.slice(start, start + 400);
          scored.push({
            key,
            snippet,
            score,
            namespace: key.split('.')[0] ?? 'common',
          });
        }
      }

      scored.sort((a, b) => b.score - a.score);
      const top = scored.slice(0, input.limit);

      return {
        ok: true,
        output: {
          results: top.map((r) => ({
            key: r.key,
            namespace: r.namespace,
            snippet: r.snippet,
            locale,
          })),
          total: scored.length,
        },
      };
    } catch (err) {
      void ctx.audit.record({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        category: 'ai_assistant',
        code: 'ai.tool_invoked',
        result: 'deny',
        reason: `help.searchDocumentation:${(err as Error).message.slice(0, 200)}`,
        correlationId: ctx.requestId,
      });
      return { ok: false, reasonKey: 'ai.errors.toolFailed', status: 'failed' };
    }
  },
};
