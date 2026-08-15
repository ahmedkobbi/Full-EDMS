import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './common/redis.module';
import { StorageModule } from './common/storage.module';
import { AuditModule } from './common/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { UserModule } from './modules/user/user.module';
import { DocumentModule } from './modules/document/document.module';
import { ClassificationModule } from './modules/classification/classification.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { RetentionModule } from './modules/retention/retention.module';
import { LegalHoldModule } from './modules/legal-hold/legal-hold.module';
import { AuditApiModule } from './modules/audit/audit.module';
import { SearchModule } from './modules/search/search.module';
import { ShareModule } from './modules/share/share.module';
import { NotificationModule } from './modules/notification/notification.module';
import { LicenseModule } from './modules/license/license.module';
import { ScannerModule } from './modules/scanner/scanner.module';
import { TourModule } from './modules/tour/tour.module';
import { AiModule } from './modules/ai/ai.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthModule } from './modules/health/health.module';
import { GroupModule } from './modules/group/group.module';
import { RoleModule } from './modules/role/role.module';
import { MetadataModule } from './modules/metadata/metadata.module';
import { WebhookModule } from './modules/webhook/webhook.module';
import { ApiKeyModule } from './modules/api-key/api-key.module';
import { LocaleModule } from './modules/locale/locale.module';
import { PresenceModule } from './modules/presence/presence.module';
import { SecureViewerModule } from './modules/secure-viewer/secure-viewer.module';
import { ProvenanceModule } from './modules/provenance/provenance.module';
import { PiiDetectionModule } from './modules/pii-detection/pii-detection.module';
import { InvitationModule } from './modules/invitation/invitation.module';
import { MalwareScanModule } from './modules/malware-scan/malware-scan.module';
import { CryptoShreddingModule } from './modules/crypto-shredding/crypto-shredding.module';
import { AiWorkflowModule } from './modules/ai-workflow/ai-workflow.module';
import { KnowledgeGraphModule } from './modules/knowledge-graph/knowledge-graph.module';
import { CaptureRulesModule } from './modules/capture-rules/capture-rules.module';
import { MigrationModule } from './modules/migration/migration.module';
import { EmailModule } from './modules/email/email.module';
import { OcrModule } from './modules/ocr/ocr.module';
import { PhysicalTwinModule } from './modules/physical-twin/physical-twin.module';
import { QuotaModule } from './modules/quota/quota.module';
import { StepUpAuthModule } from './modules/step-up-auth/step-up-auth.module';
import { WebSocketModule } from './websocket/websocket.module';
import { WorkflowReminderCron } from './modules/workflow/workflow-reminder-cron';
import { StepUpGuard } from './common/guards/step-up.guard';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { ApiKeyAuthGuard } from './common/guards/api-key-auth.guard';
import { TenantGuard } from './common/guards/tenant.guard';
import { LicenseGuard } from './common/guards/license.guard';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { environmentSchema } from './config/environment';

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
