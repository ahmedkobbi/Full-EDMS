"use strict";
/**
 * @smart-edms/schemas — search, DLA, Flex Search (spec §9.10)
 *
 * Zod schemas for: search query, facet aggregation, saved search create,
 * flex search query.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateSavedSearchRequestSchema = exports.SavedSearchSchema = exports.FlexSearchHitSchema = exports.FlexSearchQuerySchema = exports.SearchResultSchema = exports.SearchFacetResultSchema = exports.SearchFacetBucketSchema = exports.SearchHitSchema = exports.DlaBlockRefSchema = exports.SearchQuerySchema = exports.SearchSortSchema = exports.SearchFacetSchema = exports.SearchFilterSchema = exports.SearchFilterClauseSchema = exports.DlaBlockKindSchema = exports.SearchFacetKindSchema = exports.SearchSortDirectionSchema = exports.FilterComparatorSchema = exports.BooleanOperatorSchema = exports.SavedSearchIdSchema = void 0;
const zod_1 = require("zod");
const common_1 = require("./common");
const tenant_1 = require("./tenant");
const user_1 = require("./user");
const document_1 = require("./document");
const classification_1 = require("./classification");
// ---------------------------------------------------------------------------
// Branded identifiers
// ---------------------------------------------------------------------------
exports.SavedSearchIdSchema = common_1.UuidSchema.transform((v) => v);
// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
/** `z.infer` === `BooleanOperator`. */
exports.BooleanOperatorSchema = zod_1.z.enum(['and', 'or', 'not']);
/** `z.infer` === `FilterComparator`. */
exports.FilterComparatorSchema = zod_1.z.enum([
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
exports.SearchSortDirectionSchema = zod_1.z.enum(['asc', 'desc']);
/** `z.infer` === `SearchFacetKind`. */
exports.SearchFacetKindSchema = zod_1.z.enum([
    'terms',
    'range',
    'date_histogram',
    'statistical',
]);
/** `z.infer` === `DlaBlockKind`. */
exports.DlaBlockKindSchema = zod_1.z.enum([
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
exports.SearchFilterClauseSchema = zod_1.z
    .object({
    field: zod_1.z.string().min(1).max(128),
    comparator: exports.FilterComparatorSchema,
    // `value` is genuinely untrusted — the comparator + field type
    // determine the expected shape. Server validates.
    value: zod_1.z.unknown(),
})
    .strict();
exports.SearchFilterSchema = zod_1.z.lazy(() => zod_1.z.union([
    zod_1.z
        .object({
        kind: zod_1.z.literal('clause'),
        clause: exports.SearchFilterClauseSchema,
    })
        .strict(),
    zod_1.z
        .object({
        kind: zod_1.z.literal('boolean'),
        operator: exports.BooleanOperatorSchema,
        children: zod_1.z.array(exports.SearchFilterSchema),
    })
        .strict(),
]));
// ---------------------------------------------------------------------------
// Facets
// ---------------------------------------------------------------------------
/** `z.infer` matches `SearchFacet`. */
exports.SearchFacetSchema = zod_1.z
    .object({
    kind: exports.SearchFacetKindSchema,
    field: zod_1.z.string().min(1).max(128),
    size: zod_1.z.number().int().min(1).max(200).optional(),
    ranges: zod_1.z
        .array(zod_1.z
        .object({
        from: zod_1.z.number().optional(),
        to: zod_1.z.number().optional(),
    })
        .strict())
        .optional(),
    interval: zod_1.z
        .enum(['minute', 'hour', 'day', 'week', 'month', 'quarter', 'year'])
        .optional(),
})
    .strict();
/** `z.infer` matches `SearchSort`. */
exports.SearchSortSchema = zod_1.z
    .object({
    field: zod_1.z.string().min(1).max(128),
    direction: exports.SearchSortDirectionSchema,
})
    .strict();
// ---------------------------------------------------------------------------
// Search query
// ---------------------------------------------------------------------------
/** `z.infer` matches `SearchQuery`. */
exports.SearchQuerySchema = zod_1.z
    .object({
    tenantId: tenant_1.TenantIdSchema.optional(),
    text: zod_1.z.string().min(0).max(4096).nullable(),
    filter: exports.SearchFilterSchema.nullable(),
    facets: zod_1.z.array(exports.SearchFacetSchema),
    sort: zod_1.z.array(exports.SearchSortSchema),
    limit: zod_1.z.number().int().min(1).max(200),
    cursor: zod_1.z.string().min(1).max(1024).nullable(),
    includeDla: zod_1.z.boolean(),
    includeOcr: zod_1.z.boolean(),
    arabicNormalization: zod_1.z.boolean(),
})
    .strict();
// ---------------------------------------------------------------------------
// Hits / Results
// ---------------------------------------------------------------------------
/** `z.infer` matches `DlaBlockRef`. */
exports.DlaBlockRefSchema = zod_1.z
    .object({
    kind: exports.DlaBlockKindSchema,
    page: zod_1.z.number().int().min(1),
    boundingBox: zod_1.z
        .object({
        x: zod_1.z.number(),
        y: zod_1.z.number(),
        w: zod_1.z.number(),
        h: zod_1.z.number(),
    })
        .strict(),
    snippet: zod_1.z.string().min(0).max(4096),
})
    .strict();
/** `z.infer` matches `SearchHit`. */
exports.SearchHitSchema = zod_1.z
    .object({
    documentId: document_1.DocumentIdSchema,
    tenantId: tenant_1.TenantIdSchema,
    title: zod_1.z.string().min(1).max(512),
    snippet: zod_1.z.string().min(0).max(8192),
    score: zod_1.z.number(),
    classificationLabelId: classification_1.ClassificationLabelIdSchema,
    contentLanguage: zod_1.z.string().min(1).max(16),
    updatedAt: common_1.IsoDateStringSchema,
    dlaBlocks: zod_1.z.array(exports.DlaBlockRefSchema),
    ocrSnippet: zod_1.z.string().min(0).max(8192).nullable(),
    versionNumber: zod_1.z.number().int().min(1),
})
    .strict();
/** `z.infer` matches `SearchFacetBucket`. */
exports.SearchFacetBucketSchema = zod_1.z
    .object({
    key: zod_1.z.string().min(1).max(256),
    count: zod_1.z.number().int().min(0),
    from: zod_1.z.number().optional(),
    to: zod_1.z.number().optional(),
})
    .strict();
/** `z.infer` matches `SearchFacetResult`. */
exports.SearchFacetResultSchema = zod_1.z
    .object({
    field: zod_1.z.string().min(1).max(128),
    kind: exports.SearchFacetKindSchema,
    buckets: zod_1.z.array(exports.SearchFacetBucketSchema),
})
    .strict();
/** `z.infer` matches `SearchResult`. */
exports.SearchResultSchema = zod_1.z
    .object({
    hits: zod_1.z.array(exports.SearchHitSchema),
    facets: zod_1.z.array(exports.SearchFacetResultSchema),
    total: zod_1.z.number().int().min(0),
    nextCursor: zod_1.z.string().min(1).max(1024).nullable(),
    tookMs: zod_1.z.number().int().min(0),
    cached: zod_1.z.boolean(),
})
    .strict();
// ---------------------------------------------------------------------------
// Flex Search
// ---------------------------------------------------------------------------
/** `z.infer` matches `FlexSearchQuery`. */
exports.FlexSearchQuerySchema = zod_1.z
    .object({
    tenantId: tenant_1.TenantIdSchema.optional(),
    text: zod_1.z.string().min(1).max(4096),
    documentTypeIds: zod_1.z.array(common_1.UuidSchema),
    classificationLabelIds: zod_1.z.array(classification_1.ClassificationLabelIdSchema),
    dateRange: zod_1.z
        .object({
        from: common_1.IsoDateStringSchema.nullable(),
        to: common_1.IsoDateStringSchema.nullable(),
    })
        .strict(),
    multimodal: zod_1.z.boolean(),
    graphTraversal: zod_1.z.boolean(),
    limit: zod_1.z.number().int().min(1).max(200),
    cursor: zod_1.z.string().min(1).max(1024).nullable(),
})
    .strict();
/** `z.infer` matches `FlexSearchHit`. */
exports.FlexSearchHitSchema = zod_1.z
    .object({
    documentId: document_1.DocumentIdSchema,
    title: zod_1.z.string().min(1).max(512),
    score: zod_1.z.number(),
    related: zod_1.z.array(zod_1.z
        .object({
        documentId: document_1.DocumentIdSchema,
        relation: zod_1.z.string().min(1).max(64),
    })
        .strict()),
    mediaTimestamps: zod_1.z.array(zod_1.z
        .object({
        startMs: zod_1.z.number().int().min(0),
        endMs: zod_1.z.number().int().min(0),
    })
        .strict()),
})
    .strict();
// ---------------------------------------------------------------------------
// Saved search
// ---------------------------------------------------------------------------
/** `z.infer` matches `SavedSearch`. */
exports.SavedSearchSchema = zod_1.z
    .object({
    id: exports.SavedSearchIdSchema,
    tenantId: tenant_1.TenantIdSchema,
    ownerUserId: user_1.UserIdSchema,
    name: zod_1.z.string().min(1).max(200),
    query: exports.SearchQuerySchema,
    alertSubscription: zod_1.z
        .object({
        enabled: zod_1.z.boolean(),
        interval: zod_1.z.enum(['hourly', 'daily', 'weekly']),
        lastNotifiedAt: common_1.IsoDateStringSchema.nullable(),
    })
        .nullable(),
    createdAt: common_1.IsoDateStringSchema,
    updatedAt: common_1.IsoDateStringSchema,
})
    .strict();
/** Request body for `POST /v1/search/saved`. */
exports.CreateSavedSearchRequestSchema = zod_1.z
    .object({
    name: zod_1.z.string().min(1).max(200),
    query: exports.SearchQuerySchema,
    alertSubscription: zod_1.z
        .object({
        enabled: zod_1.z.boolean(),
        interval: zod_1.z.enum(['hourly', 'daily', 'weekly']),
    })
        .optional(),
})
    .strict();
//# sourceMappingURL=search.js.map