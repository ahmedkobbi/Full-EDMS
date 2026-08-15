/**
 * Smart EDMS — Search module.
 *
 * Wires the Search controller + service + indexer with their dependencies:
 *  - PrismaService (global)
 *  - AuditService (global)
 *  - RedisService (global) — used by SearchIndexer to publish `search.index.updated`
 *    WebSocket events.
 *
 * Exports `SearchService` and `SearchIndexer` so other modules (e.g. the
 * Document module) can depend on them. The Document module imports
 * SearchModule to call `SearchIndexer.indexDocument` fire-and-forget after
 * upload-complete / restore / update / delete.
 *
 * Spec ref: §9.10 (search module), §15.3 (module wiring).
 */

import { Module } from '@nestjs/common';
import { SearchController } from './search.controller.js';
import { SearchService } from './search.service.js';
import { SearchIndexer } from './search-indexer.js';

@Module({
  controllers: [SearchController],
  providers: [SearchService, SearchIndexer],
  exports: [SearchService, SearchIndexer],
})
export class SearchModule {}
