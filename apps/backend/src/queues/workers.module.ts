import { Module } from '@nestjs/common';
import {
  DocumentProcessingWorker,
  SearchIndexingWorker,
  AuditExportWorker,
  RetentionEvaluationWorker,
  ScannerOcrWorker,
} from './workers';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../common/redis.module';
import { StorageModule } from '../common/storage.module';
import { AuditModule } from '../common/audit.module';
import { OcrModule } from '../modules/ocr/ocr.module';

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
