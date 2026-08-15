import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis.service';

/**
 * Public health/readiness endpoints.
 * Spec ref: §22.2 (health checks and readiness checks), §27.8 (deploy without health checks forbidden).
 */
@Controller('v1/health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get('live')
  liveness() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Public()
  @Get('ready')
  async readiness() {
    let dbOk = false;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbOk = true;
    } catch {
      dbOk = false;
    }
    let redisOk = false;
    try {
      await this.redis.connection.ping();
      redisOk = true;
    } catch {
      redisOk = false;
    }
    const ok = dbOk && redisOk;
    return {
      status: ok ? 'ready' : 'not_ready',
      checks: { db: dbOk, redis: redisOk },
      timestamp: new Date().toISOString(),
    };
  }
}
