import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SigningKeyService } from '../signing-key/signing-key.service.js';
import { RedisService } from '../../common/redis.service.js';
import { Public } from '../../common/decorators/public.decorator.js';

/**
 * Health check endpoints.
 *
 * Spec ref: §21.7 (logging + monitoring), §27 (operations).
 *
 * - GET /v1/health       — liveness (returns 200 if the process is up)
 * - GET /v1/health/ready — readiness (returns 200 if DB + Redis + signing key are ready)
 */
@ApiTags('health')
@Controller('v1/health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly signingKey: SigningKeyService,
  ) {}

  /**
   * Liveness probe. Always returns 200 if the process is up.
   */
  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness probe' })
  async liveness() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  /**
   * Readiness probe. Returns 200 only if:
   *   - PostgreSQL is reachable
   *   - Redis is reachable
   *   - The signing key has been loaded
   */
  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe (checks DB + Redis + signing key)' })
  async readiness() {
    const checks: Record<string, { ok: boolean; error?: string }> = {};

    // DB
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = { ok: true };
    } catch (err) {
      checks.database = { ok: false, error: (err as Error).message };
    }

    // Redis
    try {
      const pong = await this.redis.connection.ping();
      checks.redis = { ok: pong === 'PONG' };
    } catch (err) {
      checks.redis = { ok: false, error: (err as Error).message };
    }

    // Signing key
    checks.signingKey = { ok: this.signingKey.isLoaded() };

    const allOk = Object.values(checks).every((c) => c.ok);
    return {
      status: allOk ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks,
    };
  }
}
