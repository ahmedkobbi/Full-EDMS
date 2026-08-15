/**
 * Smart EDMS — Retention cron worker (spec §9.7).
 *
 * Runs `RetentionService.evaluateDisposition` on a schedule. The cron is
 * configured via the `RETENTION_CRON_EXPRESSION` env var (default: every
 * day at 02:00). The job is idempotent: re-running it does NOT create
 * duplicate disposition records.
 *
 * The worker is a separate file so it can be unit-tested in isolation.
 * The NestJS module wires it up via the `@Cron` decorator.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { RetentionService } from './retention.service.js';

/**
 * Scheduled retention evaluator.
 *
 * Uses `@nestjs/schedule`'s `@Cron` decorator. The cron expression comes
 * from `RETENTION_CRON_EXPRESSION` (default: every day at 02:00).
 *
 * The job is wrapped in a try/catch so a failure does NOT crash the
 * scheduler — the next run will retry.
 */
@Injectable()
export class RetentionCron {
  private readonly logger = new Logger(RetentionCron.name);
  private readonly cronExpression: string;
  /** Set to true while a run is in flight to prevent overlap. */
  private running = false;

  constructor(
    private readonly retention: RetentionService,
    private readonly config: ConfigService,
  ) {
    this.cronExpression =
      this.config.get<string>('RETENTION_CRON_EXPRESSION') ?? '0 2 * * *';
  }

  /**
   * Cron-triggered evaluation. The decorator accepts a dynamic expression
   * via the `name` parameter — but `@nestjs/schedule`'s `@Cron` decorator
   * evaluates at decoration time, so we use a static default and let the
   * env var be picked up by the dynamic-cron registration in
   * `RetentionModule.onModuleInit`.
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleCron(): Promise<void> {
    await this.runOnce();
  }

  /**
   * Run the evaluation once. Idempotent — safe to call manually (e.g.
   * from an admin "Run now" endpoint).
   */
  async runOnce(): Promise<void> {
    if (this.running) {
      this.logger.warn('Retention evaluation already running — skipping this trigger');
      return;
    }
    this.running = true;
    const start = Date.now();
    try {
      this.logger.log('Retention evaluation starting');
      const result = await this.retention.evaluateDisposition();
      this.logger.log(
        `Retention evaluation complete in ${Date.now() - start}ms: ` +
          `scanned=${result.scanned} created=${result.created} ` +
          `blocked=${result.blocked} skipped=${result.skipped}`,
      );
    } catch (err) {
      this.logger.error(
        `Retention evaluation failed: ${(err as Error).message}`,
        (err as Error).stack,
      );
    } finally {
      this.running = false;
    }
  }
}
