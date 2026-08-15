/**
 * @smart-edms/schemas — search, DLA, Flex Search (spec §9.10)
 *
 * Zod schemas for: search query, facet aggregation, saved search create,
 * flex search query.
 */

import { z } from 'zod';
import type { SavedSearchId } from '@smart-edms/types';
import { IsoDateStringSchema, UuidSchema } from './common';
import { TenantIdSchema } from './tenant';
import { UserIdSchema } from './user';
import { DocumentIdSchema } from './document';
import { ClassificationLabelIdSchema } from './classification';

// ---------------------------------------------------------------------------
// Branded identifiers
// ---------------------------------------------------------------------------

export const SavedSearchIdSchema = UuidSchema.transform(
  (v): SavedSearchId => v as SavedSearchId,
);

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/** `z.infer` === `BooleanOperator`. */
export const BooleanOperatorSchema = z.enum(['and', 'or', 'not']);

/** `z.infer` === `FilterComparator`. */
export const FilterComparatorSchema = z.enum([
  'eq',
  'ne',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
  'not_in',
  'contains',
  'starts_with',
  'ends_with',
  'between',
  'exists',
  'fuzzy',
]);

/** `z.infer` === `SearchSortDirection`. */
export const SearchSortDirectionSchema = z.enum(['asc', 'desc']);

/** `z.infer` === `SearchFacetKind`. */
export const SearchFacetKindSchema = z.enum([
  'terms',
  'range',
  'date_histogram',
  'statistical',
]);

/** `z.infer` === `DlaBlockKind`. */
export const DlaBlockKindSchema = z.enum([
  'heading',
  'paragraph',
  'table',
  'table_cell',
  'list_item',
  'footer',
  'header',
  'signature',
  'caption',
  'page_number',
]);

// ---------------------------------------------------------------------------
// Filter tree (recursive)
// ---------------------------------------------------------------------------

/** `z.infer` matches `SearchFilterClause`. `value` is `z.unknown()` — server narrows by field+comparator. */
export const SearchFilterClauseSchema = z
  .object({
    field: z.string().min(1).max(128),
    comparator: FilterComparatorSchema,
    // `value` is genuinely untrusted — the comparator + field type
    // determine the expected shape. Server validates.
    value: z.unknown(),
  })
  .strict();

/**
 * `z.infer<typeof SearchFilterSchema>` matches `SearchFilter` from
 * `@smart-edms/types`. Implemented as `z.lazy` because of self-reference.
 *
 * Note: `z.unknown()` is treated as optional inside Zod objects, so the
 * inferred `clause.value` is `unknown | undefined`. This is a minor
 * structural divergence from `@smart-edms/types` (where `value` is required)
 * but does not affect runtime validation — `value: undefined` is accepted
 * by both the schema and the type at the call site.
 */
type SearchFilter =
  | {
      readonly kind: 'clause';
      readonly clause: {
        readonly field: string;
        readonly comparator: z.infer<typeof FilterComparatorSchema>;
        readonly value?: unknown;
      };
    }
  | {
      readonly kind: 'boolean';
      readonly operator: z.infer<typeof BooleanOperatorSchema>;
      readonly children: readonly SearchFilter[];
    };

export const SearchFilterSchema: z.ZodType<SearchFilter> = z.lazy(() =>
  z.union([
    z
      .object({
        kind: z.literal('clause'),
        clause: SearchFilterClauseSchema,
      })
      .strict(),
    z
      .object({
        kind: z.literal('boolean'),
        operator: BooleanOperatorSchema,
        children: z.array(SearchFilterSchema),
      })
      .strict(),
  ]),
);

// ---------------------------------------------------------------------------
// Facets
// ---------------------------------------------------------------------------

/** `z.infer` matches `SearchFacet`. */
export const SearchFacetSchema = z
  .object({
    kind: SearchFacetKindSchema,
    field: z.string().min(1).max(128),
    size: z.number().int().min(1).max(200).optional(),
    ranges: z
      .array(
        z
          .object({
            from: z.number().optional(),
            to: z.number().optional(),
          })
          .strict(),
      )
      .optional(),
    interval: z
      .enum(['minute', 'hour', 'day', 'week', 'month', 'quarter', 'year'])
      .optional(),
  })
  .strict();

/** `z.infer` matches `SearchSort`. */
export const SearchSortSchema = z
  .object({
    field: z.string().min(1).max(128),
    direction: SearchSortDirectionSchema,
  })
  .strict();

// ---------------------------------------------------------------------------
// Search query
// ---------------------------------------------------------------------------

/** `z.infer` matches `SearchQuery`. */
export const SearchQuerySchema = z
  .object({
    tenantId: TenantIdSchema.optional(),
    text: z.string().min(0).max(4096).nullable(),
    filter: SearchFilterSchema.nullable(),
    facets: z.array(SearchFacetSchema),
    sort: z.array(SearchSortSchema),
    limit: z.number().int().min(1).max(200),
    cursor: z.string().min(1).max(1024).nullable(),
    includeDla: z.boolean(),
    includeOcr: z.boolean(),
    arabicNormalization: z.boolean(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Hits / Results
// ---------------------------------------------------------------------------

/** `z.infer` matches `DlaBlockRef`. */
export const DlaBlockRefSchema = z
  .object({
    kind: DlaBlockKindSchema,
    page: z.number().int().min(1),
    boundingBox: z
      .object({
        x: z.number(),
        y: z.number(),
        w: z.number(),
        h: z.number(),
      })
      .strict(),
    snippet: z.string().min(0).max(4096),
  })
  .strict();

/** `z.infer` matches `SearchHit`. */
export const SearchHitSchema = z
  .object({
    documentId: DocumentIdSchema,
    tenantId: TenantIdSchema,
    title: z.string().min(1).max(512),
    snippet: z.string().min(0).max(8192),
    score: z.number(),
    classificationLabelId: ClassificationLabelIdSchema,
    contentLanguage: z.string().min(1).max(16),
    updatedAt: IsoDateStringSchema,
    dlaBlocks: z.array(DlaBlockRefSchema),
    ocrSnippet: z.string().min(0).max(8192).nullable(),
    versionNumber: z.number().int().min(1),
  })
  .strict();

/** `z.infer` matches `SearchFacetBucket`. */
export const SearchFacetBucketSchema = z
  .object({
    key: z.string().min(1).max(256),
    count: z.number().int().min(0),
    from: z.number().optional(),
    to: z.number().optional(),
  })
  .strict();

/** `z.infer` matches `SearchFacetResult`. */
export const SearchFacetResultSchema = z
  .object({
    field: z.string().min(1).max(128),
    kind: SearchFacetKindSchema,
    buckets: z.array(SearchFacetBucketSchema),
  })
  .strict();

/** `z.infer` matches `SearchResult`. */
export const SearchResultSchema = z
  .object({
    hits: z.array(SearchHitSchema),
    facets: z.array(SearchFacetResultSchema),
    total: z.number().int().min(0),
    nextCursor: z.string().min(1).max(1024).nullable(),
    tookMs: z.number().int().min(0),
    cached: z.boolean(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Flex Search
// ---------------------------------------------------------------------------

/** `z.infer` matches `FlexSearchQuery`. */
export const FlexSearchQuerySchema = z
  .object({
    tenantId: TenantIdSchema.optional(),
    text: z.string().min(1).max(4096),
    documentTypeIds: z.array(UuidSchema),
    classificationLabelIds: z.array(ClassificationLabelIdSchema),
    dateRange: z
      .object({
        from: IsoDateStringSchema.nullable(),
        to: IsoDateStringSchema.nullable(),
      })
      .strict(),
    multimodal: z.boolean(),
    graphTraversal: z.boolean(),
    limit: z.number().int().min(1).max(200),
    cursor: z.string().min(1).max(1024).nullable(),
  })
  .strict();

/** `z.infer` matches `FlexSearchHit`. */
export const FlexSearchHitSchema = z
  .object({
    documentId: DocumentIdSchema,
    title: z.string().min(1).max(512),
    score: z.number(),
    related: z.array(
      z
        .object({
          documentId: DocumentIdSchema,
          relation: z.string().min(1).max(64),
        })
        .strict(),
    ),
    mediaTimestamps: z.array(
      z
        .object({
          startMs: z.number().int().min(0),
          endMs: z.number().int().min(0),
        })
        .strict(),
    ),
  })
  .strict();

// ---------------------------------------------------------------------------
// Saved search
// ---------------------------------------------------------------------------

/** `z.infer` matches `SavedSearch`. */
export const SavedSearchSchema = z
  .object({
    id: SavedSearchIdSchema,
    tenantId: TenantIdSchema,
    ownerUserId: UserIdSchema,
    name: z.string().min(1).max(200),
    query: SearchQuerySchema,
    alertSubscription: z
      .object({
        enabled: z.boolean(),
        interval: z.enum(['hourly', 'daily', 'weekly']),
        lastNotifiedAt: IsoDateStringSchema.nullable(),
      })
      .nullable(),
    createdAt: IsoDateStringSchema,
    updatedAt: IsoDateStringSchema,
  })
  .strict();

/** Request body for `POST /v1/search/saved`. */
export const CreateSavedSearchRequestSchema = z
  .object({
    name: z.string().min(1).max(200),
    query: SearchQuerySchema,
    alertSubscription: z
      .object({
        enabled: z.boolean(),
        interval: z.enum(['hourly', 'daily', 'weekly']),
      })
      .optional(),
  })
  .strict();
