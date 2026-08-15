/**
 * Smart EDMS — Document module WebSocket event name constants.
 *
 * These mirror the names defined in `@smart-edms/types` `WebSocketEventName`.
 * They are re-declared here as plain `const` strings so the Document service
 * can emit them without importing the entire types package at runtime.
 *
 * Spec ref: §9.3 (document lifecycle), §13.4 (WebSocket event catalogue),
 * §13.5 (event payload contract).
 *
 * The Document service emits these by publishing to a Redis pub/sub channel
 * (`smart-edms:ws-events:${tenantId}`). The WebSocket gateway (when wired up
 * in a sibling module) subscribes to that channel and forwards events to
 * authorized Socket.IO rooms. This decouples the Document module from the
 * WebSocket module — there is no direct import dependency, and the modules
 * can be built and tested independently.
 */

export const DOCUMENT_WS_EVENTS = {
  /** Emitted when a new Document is created (status transitions to ACTIVE). */
  DOCUMENT_CREATED: 'document.created',
  /** Emitted when a Document's metadata is updated. */
  DOCUMENT_UPDATED: 'document.updated',
  /** Emitted when a Document is soft-deleted. */
  DOCUMENT_DELETED: 'document.deleted',
  /** Emitted when a new DocumentVersion is committed. */
  DOCUMENT_VERSION_CREATED: 'document.version.created',
  /** Emitted when a Document's classification label changes. */
  DOCUMENT_CLASSIFICATION_CHANGED: 'document.classification.changed',
  /** Emitted when a search index is updated for a Document. */
  SEARCH_INDEX_UPDATED: 'search.index.updated',
} as const;

export type DocumentWsEventName =
  (typeof DOCUMENT_WS_EVENTS)[keyof typeof DOCUMENT_WS_EVENTS];

/**
 * Redis pub/sub channel name for tenant-scoped WebSocket fan-out.
 * The Document service publishes JSON-serialized `WebSocketEvent` payloads
 * to this channel; the WebSocket gateway subscribes.
 */
export const wsEventChannel = (tenantId: string): string =>
  `smart-edms:ws-events:${tenantId}`;
