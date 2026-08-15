import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AdminJwtPayload } from './admin-auth.service.js';
import { RedisService } from '../../common/redis.service.js';
import { createHash } from 'node:crypto';

/**
 * JWT strategy for admin endpoints on the Licensing Server.
 * Verifies the access token and checks the revocation list in Redis.
 */
@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    config: ConfigService,
    private readonly redis: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET')!,
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: AdminJwtPayload): Promise<AdminJwtPayload> {
    // Only accept access tokens (not refresh, not step-up)
    if (payload.type !== 'access') {
      throw new UnauthorizedException({ messageKey: 'errors.UNAUTHENTICATED' });
    }

    const authHeader = req.headers?.authorization ?? '';
    const token = authHeader.slice(7);
    const revoked = await this.redis.connection.get(`admin:jwt:revoked:${sha256(token)}`);
    if (revoked === '1') {
      throw new UnauthorizedException({ messageKey: 'errors.UNAUTHENTICATED' });
    }

    return payload;
  }
}

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}
