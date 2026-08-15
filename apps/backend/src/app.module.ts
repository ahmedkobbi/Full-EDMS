import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from './prisma/prisma.module.js';
import { RedisModule } from './common/redis.module.js';
import { StorageModule } from './common/storage.module.js';
import { AuditModule } from './common/audit.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { TenantModule } from './modules/tenant/tenant.module.js';
import { UserModule } from './modules/user/user.module.js';
import { DocumentModule } from './modules/document/document.module.js';
import { ClassificationModule } from './modules/classification/classification.module.js';
import { WorkflowModule } from './modules/workflow/workflow.module.js';
import { RetentionModule } from './modules/retention/retention.module.js';
import { LegalHoldModule } from './modules/legal-hold/legal-hold.module.js';
import { AuditApiModule } from './modules/audit/audit.module.js';
import { SearchModule } from './modules/search/search.module.js';
import { ShareModule } from './modules/share/share.module.js';
import { NotificationModule } from './modules/notification/notification.module.js';
import { LicenseModule } from './modules/license/license.module.js';
import { ScannerModule } from './modules/scanner/scanner.module.js';
import { TourModule } from './modules/tour/tour.module.js';
import { AiModule } from './modules/ai/ai.module.js';
import { AdminModule } from './modules/admin/admin.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { GroupModule } from './modules/group/group.module.js';
import { RoleModule } from './modules/role/role.module.js';
import { MetadataModule } from './modules/metadata/metadata.module.js';
import { WebhookModule } from './modules/webhook/webhook.module.js';
import { ApiKeyModule } from './modules/api-key/api-key.module.js';
import { LocaleModule } from './modules/locale/locale.module.js';
import { PresenceModule } from './modules/presence/presence.module.js';
import { SecureViewerModule } from './modules/secure-viewer/secure-viewer.module.js';
import { ProvenanceModule } from './modules/provenance/provenance.module.js';
import { PiiDetectionModule } from './modules/pii-detection/pii-detection.module.js';
import { InvitationModule } from './modules/invitation/invitation.module.js';
import { MalwareScanModule } from './modules/malware-scan/malware-scan.module.js';
import { CryptoShreddingModule } from './modules/crypto-shredding/crypto-shredding.module.js';
import { AiWorkflowModule } from './modules/ai-workflow/ai-workflow.module.js';
import { KnowledgeGraphModule } from './modules/knowledge-graph/knowledge-graph.module.js';
import { CaptureRulesModule } from './modules/capture-rules/capture-rules.module.js';
import { MigrationModule } from './modules/migration/migration.module.js';
import { EmailModule } from './modules/email/email.module.js';
import { OcrModule } from './modules/ocr/ocr.module.js';
import { PhysicalTwinModule } from './modules/physical-twin/physical-twin.module.js';
import { QuotaModule } from './modules/quota/quota.module.js';
import { StepUpAuthModule } from './modules/step-up-auth/step-up-auth.module.js';
import { WebSocketModule } from './websocket/websocket.module.js';
import { WorkflowReminderCron } from './modules/workflow/workflow-reminder-cron.js';
import { StepUpGuard } from './common/guards/step-up.guard.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { ApiKeyAuthGuard } from './common/guards/api-key-auth.guard.js';
import { TenantGuard } from './common/guards/tenant.guard.js';
import { LicenseGuard } from './common/guards/license.guard.js';
import { AuditInterceptor } from './common/interceptors/audit.interceptor.js';
import { environmentSchema } from './config/environment.js';

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
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'res.headers["set-cookie"]',
              '*.password',
              '*.passwordHash',
              '*.token',
              '*.mfaSecret',
            ],
            censor: '[REDACTED]',
          },
          genReqId: (req: any) => req.id,
        },
      }),
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    StorageModule,
    AuditModule,
    AuthModule,
    TenantModule,
    UserModule,
    DocumentModule,
    ClassificationModule,
    WorkflowModule,
    RetentionModule,
    LegalHoldModule,
    AuditApiModule,
    SearchModule,
    ShareModule,
    NotificationModule,
    LicenseModule,
    ScannerModule,
    TourModule,
    AiModule,
    AdminModule,
    HealthModule,
    GroupModule,
    RoleModule,
    MetadataModule,
    WebhookModule,
    ApiKeyModule,
    LocaleModule,
    PresenceModule,
    SecureViewerModule,
    ProvenanceModule,
    PiiDetectionModule,
    InvitationModule,
    MalwareScanModule,
    CryptoShreddingModule,
    AiWorkflowModule,
    KnowledgeGraphModule,
    CaptureRulesModule,
    MigrationModule,
    EmailModule,
    OcrModule,
    PhysicalTwinModule,
    QuotaModule,
    StepUpAuthModule,
    WebSocketModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ApiKeyAuthGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: LicenseGuard },
    { provide: APP_GUARD, useClass: StepUpGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    WorkflowReminderCron,
  ],
})
export class AppModule {}
