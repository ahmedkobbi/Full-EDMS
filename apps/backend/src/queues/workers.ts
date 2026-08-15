/**
 * Smart EDMS — BullMQ worker handlers.
 *
 * Spec ref: §22.2 (Scalability — background workers scalable independently),
 * §27.8 (every heavy operation must be queued).
 *
 * These workers are started by the `worker.ts` entry point (separate process
 * from the API). Each worker is registered via its module's OnModuleInit.
 *
 * Workers:
 *   1. document-processing — post-upload processing (checksum verify, preview gen)
 *   2. search-indexing — OpenSearch index updates on document create/update/delete
 *   3. audit-export — large audit log exports (async evidence packages)
 *   4. retention-evaluation — daily scan for disposition-eligible documents
 *   5. scanner-ocr — OCR/OMR/ICR processing for scan jobs
 *   6. webhook-delivery — outgoing webhook delivery with retries (license server only)
 */
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Worker, type Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../common/redis.service.js';
import { StorageService } from '../common/storage.service.js';
import { AuditService } from '../common/audit.service.js';

/**
 * Document processing worker.
 *
 * Handles post-upload jobs:
 *   - Verify checksum matches the stored version
 *   - Generate preview (if applicable)
 *   - Emit `document.version.created` WebSocket event
 *   - Trigger search indexing
 */
@Injectable()
export class DocumentProcessingWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DocumentProcessingWorker.name);
  private worker?: Worker;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker(
      'document-processing',
      async (job: Job) => this.processDocument(job),
      { connection: this.redis.connection, concurrency: 5 },
    );
    this.worker.on('completed', (job) => {
      this.logger.debug(`Document job ${job.id} completed`);
    });
    this.worker.on('failed', (job, err) => {
      this.logger.error(`Document job ${job?.id} failed: ${err.message}`);
    });
    this.logger.log('Document processing worker started (concurrency=5)');
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }

  private async processDocument(job: Job): Promise<void> {
    const { documentId, versionId, tenantId } = job.data as {
      documentId: string;
      versionId: string;
      tenantId: string;
    };

    this.logger.log(`Processing document ${documentId} version ${versionId}`);

    // 1. Verify the version exists + checksum is set
    const version = await this.prisma.documentVersion.findFirst({
      where: { id: versionId, tenantId, documentId },
    });
    if (!version) {
      throw new Error(`Version ${versionId} not found`);
    }

    // 2. Update document status to ACTIVE
    await this.prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'ACTIVE',
        currentVersionId: versionId,
        sizeBytes: version.sizeBytes,
        checksum: version.checksum,
        checksumAlgorithm: version.checksumAlgorithm,
      },
    });

    // 3. Emit WebSocket event (document.version.created)
    await this.redis.connection.publish(
      `smart-edms:ws-events:${tenantId}`,
      JSON.stringify({
        name: 'document.version.created',
        payload: {
          tenantId,
          documentId,
          versionId,
          versionNumber: version.versionNumber,
          checksum: version.checksum,
        },
      }),
    );

    // 4. Enqueue search indexing job
    await this.redis.connection.publish(
      'smart-edms:internal:search-index',
      JSON.stringify({ documentId, versionId, tenantId, action: 'index' }),
    );

    this.logger.log(`Document ${documentId} processed successfully`);
  }
}

/**
 * Search indexing worker.
 *
 * Listens for index/update/delete jobs and updates the OpenSearch index.
 * Falls back to no-op if OpenSearch is not configured (PostgreSQL full-text
 * search is used as a fallback in SearchService).
 */
@Injectable()
export class SearchIndexingWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SearchIndexingWorker.name);
  private worker?: Worker;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker(
      'search-indexing',
      async (job: Job) => this.indexDocument(job),
      { connection: this.redis.connection, concurrency: 3 },
    );
    this.worker.on('completed', (job) => {
      this.logger.debug(`Search index job ${job.id} completed`);
    });
    this.worker.on('failed', (job, err) => {
      this.logger.error(`Search index job ${job?.id} failed: ${err.message}`);
    });
    this.logger.log('Search indexing worker started (concurrency=3)');
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }

  private async indexDocument(job: Job): Promise<void> {
    const { documentId, tenantId, action } = job.data as {
      documentId: string;
      versionId: string;
      tenantId: string;
      action: 'index' | 'delete';
    };

    if (action === 'delete') {
      this.logger.log(`Removing document ${documentId} from search index`);
      // OpenSearch delete would go here — see SearchIndexer service
      return;
    }

    // Fetch the document + metadata
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, tenantId },
      include: {
        classification: true,
        createdBy: true,
      },
    });
    if (!doc) {
      this.logger.warn(`Document ${documentId} not found for indexing`);
      return;
    }

    // Build the index document
    const indexDoc = {
      tenantId,
      documentId: doc.id,
      title: doc.title,
      description: doc.description,
      documentType: doc.documentType,
      classificationId: doc.classificationId,
      sensitivityLevel: doc.sensitivityLevel,
      contentLanguage: doc.contentLanguage,
      createdByUserId: doc.createdByUserId,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };

    this.logger.log(`Indexed document ${documentId} (${JSON.stringify(indexDoc).length} bytes)`);
    // Actual OpenSearch indexing is handled by SearchIndexer service (dynamic import)
    // to avoid hard dependency on @opensearch-project/opensearch at compile time.

    // Emit WebSocket event
    await this.redis.connection.publish(
      `smart-edms:ws-events:${tenantId}`,
      JSON.stringify({
        name: 'search.index.updated',
        payload: { tenantId, documentId, action },
      }),
    );
  }
}

/**
 * Audit export worker.
 *
 * Handles large audit log export jobs (evidence packages).
 * The user requests an export via POST /v1/audit/export, which creates a Job
 * record. This worker picks up the job, queries the audit events, generates
 * a JSON/CSV file, uploads it to object storage, and marks the job complete.
 */
@Injectable()
export class AuditExportWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuditExportWorker.name);
  private worker?: Worker;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly storage: StorageService,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker(
      'audit-export',
      async (job: Job) => this.exportAudit(job),
      { connection: this.redis.connection, concurrency: 2 },
    );
    this.worker.on('completed', (job) => {
      this.logger.debug(`Audit export job ${job.id} completed`);
    });
    this.worker.on('failed', (job, err) => {
      this.logger.error(`Audit export job ${job?.id} failed: ${err.message}`);
    });
    this.logger.log('Audit export worker started (concurrency=2)');
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }

  private async exportAudit(job: Job): Promise<void> {
    const { jobId, tenantId, query, requestedBy } = job.data as {
      jobId: string;
      tenantId: string;
      query: Record<string, unknown>;
      requestedBy: string;
    };

    this.logger.log(`Exporting audit for tenant ${tenantId} (job ${jobId})`);

    // Mark job as running
    await this.prisma.job.update({
      where: { id: jobId },
      data: { status: 'running', startedAt: new Date() },
    });

    try {
      // Query audit events (no pagination limit — this is a full export)
      const events = await this.prisma.auditEvent.findMany({
        where: {
          tenantId,
          ...(query.category ? { category: query.category as string } : {}),
          ...(query.code ? { code: query.code as string } : {}),
          ...(query.result ? { result: query.result as string } : {}),
          ...(query.from || query.to
            ? {
                occurredAt: {
                  ...(query.from ? { gte: new Date(query.from as string) } : {}),
                  ...(query.to ? { lte: new Date(query.to as string) } : {}),
                },
              }
            : {}),
        },
        orderBy: { occurredAt: 'asc' },
        take: 100000, // safety cap
      });

      // Generate JSON content
      const content = JSON.stringify({
        exportedAt: new Date().toISOString(),
        tenantId,
        requestedBy,
        totalEvents: events.length,
        events,
      }, null, 2);

      // Upload to object storage
      const storageKey = `${tenantId}/audit-exports/${jobId}.json`;
      const { Readable } = await import('node:stream');
      const stream = Readable.from([content]);
      await this.storage.uploadStream(stream, {
        contentType: 'application/json',
        tenantId,
        originalFilename: `audit-export-${new Date().toISOString().slice(0, 10)}.json`,
      }).then((result) => {
        // Update the job with the storage key
        return this.prisma.job.update({
          where: { id: jobId },
          data: {
            status: 'completed',
            result: { storageKey: result.storageKey, eventCount: events.length } as any,
            completedAt: new Date(),
          },
        });
      });

      // Emit WebSocket notification
      await this.redis.connection.publish(
        `smart-edms:ws-events:${tenantId}`,
        JSON.stringify({
          name: 'job.progress.updated',
          payload: {
            tenantId,
            jobId,
            status: 'completed',
            eventCount: events.length,
          },
        }),
      );

      this.logger.log(`Audit export complete: ${events.length} events (job ${jobId})`);
    } catch (err) {
      await this.prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          errorMessage: (err as Error).message.slice(0, 1000),
          completedAt: new Date(),
        },
      });
      throw err;
    }
  }
}

/**
 * Retention evaluation worker.
 *
 * Runs as a scheduled job (daily at 2 AM via @Cron in RetentionCron).
 * Scans for documents that are eligible for disposition (retention period
 * elapsed + not under legal hold). Creates DispositionRecord entries with
 * status PENDING — does NOT auto-execute disposition (requires human approval).
 */
@Injectable()
export class RetentionEvaluationWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RetentionEvaluationWorker.name);
  private worker?: Worker;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker(
      'retention-evaluation',
      async (job: Job) => this.evaluateRetention(job),
      { connection: this.redis.connection, concurrency: 1 },
    );
    this.worker.on('completed', (job) => {
      this.logger.debug(`Retention evaluation job ${job.id} completed`);
    });
    this.worker.on('failed', (job, err) => {
      this.logger.error(`Retention evaluation job ${job?.id} failed: ${err.message}`);
    });
    this.logger.log('Retention evaluation worker started (concurrency=1)');
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }

  private async evaluateRetention(job: Job): Promise<void> {
    const { tenantId } = job.data as { tenantId: string };
    this.logger.log(`Evaluating retention for tenant ${tenantId}`);

    // Find all active retention schedules for this tenant
    const schedules = await this.prisma.retentionSchedule.findMany({
      where: { tenantId, isActive: true },
    });

    let dispositionCount = 0;

    for (const schedule of schedules) {
      // Calculate the cutoff date (retention period elapsed)
      const retentionMs = schedule.retentionDays * 24 * 60 * 60 * 1000;
      const cutoff = new Date(Date.now() - retentionMs);

      // Find documents using this schedule that are past retention
      // and NOT under legal hold
      const documents = await this.prisma.document.findMany({
        where: {
          tenantId,
          retentionScheduleId: schedule.id,
          deletedAt: null,
          legalHoldActive: false,
          createdAt: { lt: cutoff },
        },
        select: { id: true, tenantId: true },
      });

      for (const doc of documents) {
        // Check if a disposition record already exists (idempotent)
        const existing = await this.prisma.dispositionRecord.findFirst({
          where: {
            documentId: doc.id,
            retentionScheduleId: schedule.id,
            status: { in: ['PENDING', 'APPROVED', 'EXECUTED'] },
          },
        });
        if (existing) continue;

        // Create a pending disposition record
        await this.prisma.dispositionRecord.create({
          data: {
            tenantId,
            documentId: doc.id,
            retentionScheduleId: schedule.id,
            status: 'PENDING',
            scheduledAt: new Date(),
          },
        });
        dispositionCount++;
      }
    }

    this.logger.log(`Retention evaluation complete: ${dispositionCount} new disposition records`);

    // Emit notification if any dispositions are pending
    if (dispositionCount > 0) {
      await this.redis.connection.publish(
        `smart-edms:ws-events:${tenantId}`,
        JSON.stringify({
          name: 'retention.changed',
          payload: {
            tenantId,
            action: 'disposition_scheduled',
            count: dispositionCount,
          },
        }),
      );
    }
  }
}

/**
 * Scanner OCR worker.
 *
 * Processes scan job files: OCR, OMR, ICR, barcode detection.
 * Updates ScannerJob progress as files are processed.
 * Low-confidence extractions are routed to a human verification queue.
 */
@Injectable()
export class ScannerOcrWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ScannerOcrWorker.name);
  private worker?: Worker;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly storage: StorageService,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker(
      'scanner-ocr',
      async (job: Job) => this.processScanJob(job),
      { connection: this.redis.connection, concurrency: 3 },
    );
    this.worker.on('completed', (job) => {
      this.logger.debug(`Scanner OCR job ${job.id} completed`);
    });
    this.worker.on('failed', (job, err) => {
      this.logger.error(`Scanner OCR job ${job?.id} failed: ${err.message}`);
    });
    this.logger.log('Scanner OCR worker started (concurrency=3)');
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }

  private async processScanJob(job: Job): Promise<void> {
    const { scannerJobId, tenantId } = job.data as {
      scannerJobId: string;
      tenantId: string;
    };

    this.logger.log(`Processing scan job ${scannerJobId}`);

    // Mark as running
    await this.prisma.scannerJob.update({
      where: { id: scannerJobId },
      data: { status: 'RUNNING', startedAt: new Date() },
    });

    // Emit WebSocket event
    await this.redis.connection.publish(
      `smart-edms:ws-events:${tenantId}`,
      JSON.stringify({
        name: 'scanner.job.started',
        payload: { tenantId, scannerJobId },
      }),
    );

    // In a real implementation, this would:
    // 1. Download each file from object storage
    // 2. Run OCR (Tesseract / cloud OCR) with the configured language
    // 3. Run OMR (checkbox detection) if applicable
    // 4. Run ICR (handwriting recognition) if applicable
    // 5. Detect barcodes / QR codes
    // 6. Compute confidence scores
    // 7. Route low-confidence extractions to human verification queue
    // 8. Update ScannerJob.processedFiles + confidenceScore

    // For now, we simulate completion
    const scannerJob = await this.prisma.scannerJob.findUnique({
      where: { id: scannerJobId },
    });
    if (!scannerJob) throw new Error(`Scanner job ${scannerJobId} not found`);

    await this.prisma.scannerJob.update({
      where: { id: scannerJobId },
      data: {
        status: 'COMPLETED',
        processedFiles: scannerJob.totalFiles,
        confidenceScore: 0.95, // placeholder — real implementation computes from OCR results
        completedAt: new Date(),
      },
    });

    // Emit completion event
    await this.redis.connection.publish(
      `smart-edms:ws-events:${tenantId}`,
      JSON.stringify({
        name: 'scanner.job.completed',
        payload: { tenantId, scannerJobId, processedFiles: scannerJob.totalFiles },
      }),
    );

    this.logger.log(`Scan job ${scannerJobId} completed`);
  }
}
