import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from './prisma/prisma.module.js';
import { RedisModule } from './common/redis.module.js';
import { JwtConfigModule } from './common/jwt/jwt-config.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { SigningKeyModule } from './modules/signing-key/signing-key.module.js';
import { CustomerModule } from './modules/customer/customer.module.js';
import { ProductModule } from './modules/product/product.module.js';
import { LicenseModule } from './modules/license/license.module.js';
import { ActivationModule } from './modules/activation/activation.module.js';
import { HeartbeatModule } from './modules/heartbeat/heartbeat.module.js';
import { TrialModule } from './modules/trial/trial.module.js';
import { WebhookModule } from './modules/webhook/webhook.module.js';
import { RevocationModule } from './modules/revocation/revocation.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { CronModule } from './modules/cron/cron.module.js';
import { AdminAuthModule } from './modules/admin-auth/admin-auth.module.js';
import { DeviceModule } from './modules/device/device.module.js';
import { UsageModule } from './modules/usage/usage.module.js';
import { ApiKeyModule } from './modules/api-key/api-key.module.js';
import { AdminUserModule } from './modules/admin-user/admin-user.module.js';
import { AuditInterceptor } from './common/audit.interceptor.js';
import { environmentSchema } from './config/environment.js';

/**
 * Root module for the Smart EDMS Licensing Server.
 *
 * Spec ref: §4.2 (licensing server model), §7.3 (licensing server stack),
 * §12 (licensing system requirements).
 *
 * The licensing server is a SEPARATE NestJS app from the on-prem backend.
 * It runs in the vendor's cloud/hosted environment and holds the private
 * signing keys (NEVER embedded in client artifacts).
 *
 * Stack: NestJS + Fastify + Prisma + PostgreSQL + Redis + BullMQ + Pino +
 * OpenAPI.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: (raw: Record<string, unknown>) => environmentSchema.parse(raw),
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.get<string>('LOG_LEVEL') ?? 'info',
          transport:
            config.get<string>('NODE_ENV') === 'production'
              ? undefined
              : { target: 'pino-pretty', options: { colorize: true, singleLine: true } },
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'req.headers["x-api-key"]',
              'res.headers["set-cookie"]',
              '*.password',
              '*.passwordHash',
              '*.token',
              '*.mfaSecret',
              '*.activationCode',
              '*.activationCodeHash',
              '*.secretHash',
              '*.privateKeyPem',
              '*.secret',
            ],
            censor: '[REDACTED]',
          },
          genReqId: (req: { id?: string }) => req.id,
        },
      }),
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    JwtConfigModule,
    AuditModule,
    SigningKeyModule,
    CustomerModule,
    ProductModule,
    LicenseModule,
    ActivationModule,
    HeartbeatModule,
    TrialModule,
    WebhookModule,
    RevocationModule,
    HealthModule,
    CronModule,
    AdminAuthModule,
    DeviceModule,
    UsageModule,
    ApiKeyModule,
    AdminUserModule,
  ],
  providers: [
    // AdminJwtGuard is applied selectively (admin endpoints). Activation
    // + heartbeat endpoints use ApiKeyGuard instead. Public routes
    // (health, CRL fetch) use @Public().
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    // Note: we do NOT register AdminJwtGuard or ApiKeyGuard globally —
    // each controller explicitly opts in via @UseGuards().
  ],
})
export class AppModule {}
