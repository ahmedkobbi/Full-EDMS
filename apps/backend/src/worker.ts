/**
 * Smart EDMS background worker entry point.
 *
 * Runs BullMQ workers for:
 * - document processing (checksum verification, antivirus scan queue, index propagation)
 * - search indexing (OpenSearch)
 * - audit export (large evidence packages)
 * - retention evaluation (daily cron)
 * - scanner OCR/OMR/ICR pipeline
 * - webhook delivery (when licensed server is offline)
 * - notification dispatch (email, desktop push)
 *
 * Spec ref: §22.2 (scalability — background workers scalable independently),
 *           §27.8 (every heavy operation must be queued).
 *
 * This process is separate from the API so it can be scaled independently
 * (see docker-compose.yml `worker` service).
 */
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger as PinoLogger } from 'nestjs-pino';
import { WorkerModule } from './worker.module';

async function bootstrap(): Promise<void> {
  const logger = new Logger('worker');
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(PinoLogger));
  app.enableShutdownHooks();

  const config = app.get(ConfigService);
  logger.log(`Smart EDMS worker started (pid=${process.pid}, env=${config.get<string>('NODE_ENV')})`);

  // Workers are instantiated by their respective modules via OnModuleInit.
  // The process stays alive listening for jobs until SIGTERM/SIGINT.
  const shutdown = async (signal: string) => {
    logger.log(`Received ${signal}, shutting down gracefully...`);
    await app.close();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

void bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal worker bootstrap error:', err);
  process.exit(1);
});
