import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { AdminAuthController } from './admin-auth.controller.js';
import { AdminAuthService } from './admin-auth.service.js';
import { AdminJwtStrategy } from './admin-jwt.strategy.js';

/**
 * Admin authentication module for the Licensing Server.
 *
 * Spec ref: §12.10 (license admin panel — secure login, MFA, role-based access).
 *
 * Two-step login flow:
 *   1. POST /v1/auth/admin/login — username + password → returns mfaTicket
 *   2. POST /v1/auth/admin/mfa/verify — mfaTicket + TOTP code → returns access + refresh tokens
 *
 * Step-up auth for sensitive operations (license revocation, signing key rotation, API key deletion):
 *   POST /v1/auth/admin/mfa/step-up — current TOTP code → returns step-up JWT (5min TTL)
 *
 * The step-up JWT is sent as `X-Step-Up-Token` header and verified by StepUpGuard.
 */
@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET')!,
        signOptions: { expiresIn: '900s' }, // 15 min access token
      }),
    }),
  ],
  controllers: [AdminAuthController],
  providers: [AdminAuthService, AdminJwtStrategy],
  exports: [AdminAuthService, JwtModule],
})
export class AdminAuthModule {}
