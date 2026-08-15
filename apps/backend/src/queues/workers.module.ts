import { Module } from '@nestjs/common';
import {
  DocumentProcessingWorker,
  SearchIndexingWorker,
  AuditExportWorker,
  RetentionEvaluationWorker,
  ScannerOcrWorker,
} from './workers.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { RedisModule } from '../common/redis.module.js';
import { StorageModule } from '../common/storage.module.js';
import { AuditModule } from '../common/audit.module.js';
import { OcrModule } from '../modules/ocr/ocr.module.js';

/**
 * Registers all BullMQ worker handlers.
 *
 * Spec ref: §22.2 (background workers scalable independently),
 * §27.8 (every heavy operation must be queued).
 *
 * This module is imported by WorkerModule (the worker process entry point).
 * It is NOT imported by AppModule (the API process) — workers run separately.
 */
@Module({
  imports: [PrismaModule, RedisModule, StorageModule, AuditModule, OcrModule],
  providers: [
    DocumentProcessingWorker,
    SearchIndexingWorker,
    AuditExportWorker,
    RetentionEvaluationWorker,
    ScannerOcrWorker,
  ],
})
export class WorkersModule {}
