/**
 * Smart EDMS — Document module.
 *
 * Wires the Document controller + service with its dependencies:
 *  - PrismaService (global, from PrismaModule)
 *  - StorageService (global, from StorageModule)
 *  - AuditService (global, from AuditModule)
 *  - RedisService (global, from RedisModule)
 *  - SearchIndexer (from SearchModule) — for fire-and-forget indexing after
 *    uploadComplete / restoreVersion / updateDocument / deleteDocument.
 *
 * The dependency is one-directional: DocumentModule imports SearchModule.
 * SearchModule does NOT import DocumentModule (search reads from Prisma
 * directly or from OpenSearch), so there is no circular dependency.
 *
 * Spec ref: §9.3 (document module), §15.3 (module wiring).
 */

import { Module } from '@nestjs/common';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [SearchModule],
  controllers: [DocumentController],
  providers: [DocumentService],
  exports: [DocumentService],
})
export class DocumentModule {}
