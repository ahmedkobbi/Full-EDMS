import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import IORedis, { type Redis } from 'ioredis';

/**
 * Shared Redis connection for:
 * - BullMQ queues (document processing, scan jobs, AI requests)
 * - Socket.IO Redis adapter (horizontal scaling, spec §13.1)
 * - Caching layer (where safe — never caches sensitive content without approval, §22.1)
 * - Rate limit counters
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  readonly connection: Redis;

  constructor(private readonly config: ConfigService) {
    const url = config.get<string>('REDIS_URL')!;
    this.connection = new IORedis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: false,
    });
    this.connection.on('error', (err) => {
      this.logger.error(`Redis error: ${err.message}`);
    });
    this.connection.on('connect', () => {
      this.logger.log('Redis connected');
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.connection.quit();
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.connection.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const raw = JSON.stringify(value);
    if (ttlSeconds) {
      await this.connection.set(key, raw, 'EX', ttlSeconds);
    } else {
      await this.connection.set(key, raw);
    }
  }

  async invalidate(key: string): Promise<void> {
    await this.connection.del(key);
  }
}
