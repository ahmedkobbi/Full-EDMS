/**
 * @smart-edms/types — search, DLA, Flex Search (spec §9.10)
 *
 * Purpose: model full-text and metadata search queries, facets, results,
 * saved searches, and the Flex Search query envelope. Search results must
 * be permission-aware and must not leak restricted document existence
 * (spec §9.10).
 */

import type { ISODateString, UUID } from './common';
import type { TenantId } from './tenant';
import type { UserId } from './user';
import type { DocumentId } from './document';
import type { ClassificationLabelId } from './classification';

/** Branded saved-search identifier. */
export type SavedSearchId = UUID & { readonly __savedSearch: 'SavedSearchId' };

/** Logical operator used to combine filter clauses. */
export type BooleanOperator = 'and' | 'or' | 'not';

/** Comparator used by a single filter clause. */
export type FilterComparator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'not_in'
  | 'contains'
  | 'starts_with'
  | 'ends_with'
  | 'between'
  | 'exists'
  | 'fuzzy';

/**
 * A single filter clause. The `field` is a whitelisted attribute path.
 * `value` is typed `unknown` because the comparator + field type determine
 * the expected shape; server-side validation is mandatory.
 */
export interface SearchFilterClause {
  readonly field: string;
  readonly comparator: FilterComparator;
  readonly value: unknown;
}

/**
 * Recursive filter tree. Each node is either a leaf clause or a boolean
 * combination of sub-nodes.
 */
export type SearchFilter =
  | { readonly kind: 'clause'; readonly clause: SearchFilterClause }
  | { readonly kind: 'boolean'; readonly operator: BooleanOperator; readonly children: readonly SearchFilter[] };

/** Sort direction for a search query. */
export type SearchSortDirection = 'asc' | 'desc';

/** A sort clause for a search query. */
export interface SearchSort {
  readonly field: string;
  readonly direction: SearchSortDirection;
}

/** Facet kind returned by the search engine. */
export type SearchFacetKind = 'terms' | 'range' | 'date_histogram' | 'statistical';

/**
 * Facet definition in a query. The engine returns aggregated counts for
 * each facet bucket.
 */
export interface SearchFacet {
  readonly kind: SearchFacetKind;
  readonly field: string;
  /** Number of buckets to return for `terms` facets. */
  readonly size?: number;
  /** Range boundaries for `range` facets. */
  readonly ranges?: ReadonlyArray<{ readonly from?: number; readonly to?: number }>;
  /** Interval for `date_histogram` facets. */
  readonly interval?: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
}

/** A single bucket returned for a facet. */
export interface SearchFacetBucket {
  readonly key: string;
  readonly count: number;
  readonly from?: number;
  readonly to?: number;
}

/** Aggregated facet result. */
export interface SearchFacetResult {
  readonly field: string;
  readonly kind: SearchFacetKind;
  readonly buckets: readonly SearchFacetBucket[];
}

/**
 * Document Layout Analysis (DLA) structural hint (spec §9.10). DLA tags
 * indexed content by structural role to enable structural queries.
 */
export type DlaBlockKind =
  | 'heading'
  | 'paragraph'
  | 'table'
  | 'table_cell'
  | 'list_item'
  | 'footer'
  | 'header'
  | 'signature'
  | 'caption'
  | 'page_number';

/** DLA block reference returned in a search hit. */
export interface DlaBlockRef {
  readonly kind: DlaBlockKind;
  readonly page: number;
  readonly boundingBox: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  readonly snippet: string;
}

/**
 * Search query. Combines a free-text query string, a structured filter tree,
 * facets, sort, and pagination. The query is permission-aware: results are
 * filtered by the caller's authorised documents (spec §9.10).
 */
export interface SearchQuery {
  readonly tenantId: TenantId;
  /** Free-text query; supports OpenSearch / Lucene query syntax. */
  readonly text: string | null;
  readonly filter: SearchFilter | null;
  readonly facets: readonly SearchFacet[];
  readonly sort: readonly SearchSort[];
  /** Cursor pagination (spec §14.3). */
  readonly limit: number;
  readonly cursor: string | null;
  /** Whether to include DLA block references in hits. */
  readonly includeDla: boolean;
  /** Whether to include OCR-extracted snippets for scanned content. */
  readonly includeOcr: boolean;
  /** Whether to apply Arabic normalisation (spec §9.10). */
  readonly arabicNormalization: boolean;
}

/**
 * Search hit. Snippets are pre-computed server-side; restricted document
 * existence must not be leaked (spec §9.10).
 */
export interface SearchHit {
  readonly documentId: DocumentId;
  readonly tenantId: TenantId;
  readonly title: string;
  /** Matched snippet, with `<mark>` highlights. */
  readonly snippet: string;
  readonly score: number;
  readonly classificationLabelId: ClassificationLabelId;
  readonly contentLanguage: string;
  readonly updatedAt: ISODateString;
  readonly dlaBlocks: readonly DlaBlockRef[];
  readonly ocrSnippet: string | null;
  readonly versionNumber: number;
}

/**
 * Search result envelope. Includes hits, facet aggregations, and the next
 * cursor for pagination.
 */
export interface SearchResult {
  readonly hits: readonly SearchHit[];
  readonly facets: readonly SearchFacetResult[];
  readonly total: number;
  readonly nextCursor: string | null;
  readonly tookMs: number;
  /** Whether the query was served from cache (spec §9.10). */
  readonly cached: boolean;
}

/**
 * Flex Search query (spec §9.10). Powerful, flexible querying across all
 * file types and metadata dimensions simultaneously. Distinct from
 * `SearchQuery` because it allows cross-document, cross-media joins and
 * returns a different hit shape.
 */
export interface FlexSearchQuery {
  readonly tenantId: TenantId;
  /** Natural-language or structured query string. */
  readonly text: string;
  /** Document-type filters. */
  readonly documentTypeIds: readonly UUID[];
  /** Classification filters. */
  readonly classificationLabelIds: readonly ClassificationLabelId[];
  /** Date range filter. */
  readonly dateRange: { readonly from: ISODateString | null; readonly to: ISODateString | null };
  /** Whether to search across multimodal content (audio/video transcripts). */
  readonly multimodal: boolean;
  /** Whether to traverse the 3D knowledge graph (spec §9.10). */
  readonly graphTraversal: boolean;
  readonly limit: number;
  readonly cursor: string | null;
}

/** Flex Search hit; richer than a standard SearchHit. */
export interface FlexSearchHit {
  readonly documentId: DocumentId;
  readonly title: string;
  readonly score: number;
  /** Cross-document related hits (graph traversal result). */
  readonly related: ReadonlyArray<{ readonly documentId: DocumentId; readonly relation: string }>;
  /** Multimodal timestamps when matched against media. */
  readonly mediaTimestamps: ReadonlyArray<{ readonly startMs: number; readonly endMs: number }>;
}

/**
 * Saved search. Per-user; may be shared with a group.
 */
export interface SavedSearch {
  readonly id: SavedSearchId;
  readonly tenantId: TenantId;
  readonly ownerUserId: UserId;
  readonly name: string;
  readonly query: SearchQuery;
  /** Optional scheduled-alert subscription. */
  readonly alertSubscription: {
    readonly enabled: boolean;
    readonly interval: 'hourly' | 'daily' | 'weekly';
    readonly lastNotifiedAt: ISODateString | null;
  } | null;
  readonly createdAt: ISODateString;
  readonly updatedAt: ISODateString;
}
