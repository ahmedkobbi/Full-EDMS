import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './common/redis.module';
import { StorageModule } from './common/storage.module';
import { AuditModule } from './common/audit.module';
import { WorkersModule } from './queues/workers.module';
import { DocumentModule } from './modules/document/document.module';
import { RetentionModule } from './modules/retention/retention.module';
import { ScannerModule } from './modules/scanner/scanner.module';
import { NotificationModule } from './modules/notification/notification.module';
import { SearchModule } from './modules/search/search.module';
import { environmentSchema } from './config/environment';

/**
 * Worker-only module — imports a subset of AppModule that the background
 * workers need (no HTTP controllers, no WebSocket gateway). Heavy job
 * processors live in WorkersModule.
 *
 * Spec ref: §22.2 (background workers scalable independently),
 * §27.8 (every heavy operation must be queued).
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: (raw) => environmentSchema.parse(raw),
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
            paths: ['*.password', '*.passwordHash', '*.token', '*.mfaSecret'],
            censor: '[REDACTED]',
          },
        },
      }),
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    StorageModule,
    AuditModule,
    WorkersModule,
    DocumentModule,
    RetentionModule,
    ScannerModule,
    NotificationModule,
    SearchModule,
  ],
})
export class WorkerModule {}
