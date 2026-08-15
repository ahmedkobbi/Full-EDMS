import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import IORedis, { type Redis } from 'ioredis';

/**
 * Shared Redis connection for the licensing server.
 *
 * Used by:
 *  - BullMQ queues (webhook delivery, scheduled CRL refresh)
 *  - Rate limit counters
 *  - Caching (signing key lookups, activation code hash cache)
 *
 * Spec ref: §7.3 (licensing server stack — Redis), §13 (queue / cache).
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  readonly connection: Redis;

  constructor(config: ConfigService) {
    const url = config.get<string>('REDIS_URL')!;
    this.connection = new IORedis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: false,
    });
    this.connection.on('error', (err: Error) => {
      this.logger.error(`Redis error: ${err.message}`);
    });
    this.connection.on('connect', () => {
      this.logger.log('Redis connected (license-server)');
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.connection.quit();
  }
}
