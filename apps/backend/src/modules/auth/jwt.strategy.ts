import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { JwtPayload } from './types.js';
import { RedisService } from '../../common/redis.service.js';
import { createHash } from 'node:crypto';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
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

  async validate(req: any, payload: JwtPayload): Promise<JwtPayload> {
    const authHeader = req.headers?.authorization ?? '';
    const token = authHeader.slice(7);
    const revoked = await this.redis.connection.get(`jwt:revoked:${sha256(token)}`);
    if (revoked === '1') {
      throw new UnauthorizedException({ messageKey: 'errors.UNAUTHENTICATED' });
    }
    return payload;
  }
}

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}
