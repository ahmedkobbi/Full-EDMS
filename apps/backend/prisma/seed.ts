/**
 * Smart EDMS — Backend database seed script.
 *
 * Creates the default tenant, an initial admin user, system classification
 * labels, default metadata schema, default retention schedules, and the 14
 * Guided Tour definitions with their steps.
 *
 * Spec ref: §9.2 (tenants), §9.4 (classification labels), §9.5 (metadata),
 *           §9.7 (retention), §10.11 (tour data model), §15.1 (core entities).
 *
 * Usage:
 *   pnpm --filter @smart-edms/backend db:seed
 *
 * Environment:
 *   SEED_ADMIN_EMAIL        — default: admin@smart-edms.local
 *   SEED_ADMIN_PASSWORD     — default: ChangeMe!2026 (MUST be changed on first login)
 *   SEED_TENANT_CODE        — default: default
 *   SEED_TENANT_NAME        — default: Default Tenant
 *
 * The seed is idempotent — running it multiple times will not duplicate data.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@smart-edms.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe!2026';
const TENANT_CODE = process.env.SEED_TENANT_CODE ?? 'default';
const TENANT_NAME = process.env.SEED_TENANT_NAME ?? 'Default Tenant';
const TENANT_SLUG = TENANT_CODE.toLowerCase().replace(/[^a-z0-9-]/g, '-');

async function main(): Promise<void> {
  console.log('Seeding Smart EDMS backend database...');

  // ─── Tenant ───────────────────────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { code: TENANT_CODE },
    update: {},
    create: {
      code: TENANT_CODE,
      name: TENANT_NAME,
      slug: TENANT_SLUG,
      status: 'ACTIVE',
      defaultLocale: 'en',
      enabledLocales: ['en', 'fr', 'ar', 'ru', 'zh-CN', 'de'],
      defaultTheme: 'system',
      flagConfig: { ar: 'neutral' } as any,
      quotaUsers: 50,
      quotaStorageBytes: BigInt(10737418240),
      quotaDocuments: 100000,
    },
  });
  console.log(`  ✓ Tenant: ${tenant.code} (${tenant.id})`);

  // ─── Admin user ───────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const admin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: ADMIN_EMAIL.toLowerCase() } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: ADMIN_EMAIL.toLowerCase(),
      emailVerified: true,
      passwordHash,
      firstName: 'System',
      lastName: 'Administrator',
      status: 'ACTIVE',
      preferredLocale: 'en',
      preferredTheme: 'system',
      preferredTimezone: 'UTC',
    },
  });
  await prisma.userPreference.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      tenantId: tenant.id,
      locale: 'en',
      theme: 'system',
      timezone: 'UTC',
    },
  });

  // ─── Roles ────────────────────────────────────────────────────────────────
  const roleDefs = [
    { code: 'admin', name: 'Administrator', permissions: ['*'], isSystem: true },
    { code: 'user-manager', name: 'User Manager', permissions: ['users.read', 'users.write', 'groups.read', 'groups.write'], isSystem: true },
    { code: 'records-manager', name: 'Records Manager', permissions: ['retention.read', 'retention.write', 'legalhold.read', 'legalhold.write', 'documents.read'], isSystem: true },
    { code: 'security-officer', name: 'Security Officer', permissions: ['classification.read', 'classification.write', 'audit.read', 'security.read'], isSystem: true },
    { code: 'auditor', name: 'Auditor', permissions: ['audit.read', 'audit.export', 'documents.read'], isSystem: true },
    { code: 'workflow-designer', name: 'Workflow Designer', permissions: ['workflows.read', 'workflows.write', 'workflows.publish'], isSystem: true },
    { code: 'it-administrator', name: 'IT Administrator', permissions: ['admin.read', 'system.health', 'system.migration'], isSystem: true },
    { code: 'end-user', name: 'End User', permissions: ['documents.read', 'documents.write', 'search.execute', 'profile.read', 'profile.write'], isSystem: true },
  ];

  for (const def of roleDefs) {
    const role = await prisma.role.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: def.code } },
      update: { permissions: def.permissions, name: def.name },
      create: { tenantId: tenant.id, ...def },
    });
    // Assign admin role to the admin user
    if (def.code === 'admin') {
      await prisma.userRoleAssignment.upsert({
        where: { userId_roleId: { userId: admin.id, roleId: role.id } },
        update: {},
        create: { userId: admin.id, roleId: role.id, tenantId: tenant.id },
      });
    }
  }
  console.log(`  ✓ ${roleDefs.length} roles + admin user (${ADMIN_EMAIL})`);

  // ─── Classification labels (spec §9.4) ────────────────────────────────────
  const classificationDefs = [
    { code: 'public', nameKey: 'classification.public.name', descriptionKey: 'classification.public.description', sensitivityLevel: 1, color: '#2563EB', bannerText: 'PUBLIC', isSystem: true },
    { code: 'internal', nameKey: 'classification.internal.name', descriptionKey: 'classification.internal.description', sensitivityLevel: 2, color: '#16A34A', bannerText: 'INTERNAL', isSystem: true },
    { code: 'confidential', nameKey: 'classification.confidential.name', descriptionKey: 'classification.confidential.description', sensitivityLevel: 3, color: '#D97706', bannerText: 'CONFIDENTIAL', isSystem: true },
    { code: 'restricted', nameKey: 'classification.restricted.name', descriptionKey: 'classification.restricted.description', sensitivityLevel: 4, color: '#DC2626', bannerText: 'RESTRICTED', isSystem: true },
    { code: 'highly-sensitive', nameKey: 'classification.highlySensitive.name', descriptionKey: 'classification.highlySensitive.description', sensitivityLevel: 5, color: '#7C2D12', bannerText: 'HIGHLY SENSITIVE', isSystem: true },
  ];

  for (const def of classificationDefs) {
    await prisma.classificationLabel.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: def.code } },
      update: { ...def },
      create: { tenantId: tenant.id, ...def },
    });
  }
  console.log(`  ✓ ${classificationDefs.length} classification labels`);

  // ─── Metadata schema (spec §9.5) ──────────────────────────────────────────
  const defaultMetadataSchema = {
    code: 'default-document',
    name: 'Default Document Metadata',
    documentType: null,
    fields: [
      { code: 'documentType', labelKey: 'metadata.fields.documentType', type: 'string', required: false },
      { code: 'businessOwner', labelKey: 'metadata.fields.businessOwner', type: 'string', required: false },
      { code: 'department', labelKey: 'metadata.fields.department', type: 'string', required: false },
      { code: 'project', labelKey: 'metadata.fields.project', type: 'string', required: false },
      { code: 'caseNumber', labelKey: 'metadata.fields.caseNumber', type: 'string', required: false },
      { code: 'reviewDate', labelKey: 'metadata.fields.reviewDate', type: 'date', required: false },
      { code: 'jurisdiction', labelKey: 'metadata.fields.jurisdiction', type: 'string', required: false },
      { code: 'sourceSystem', labelKey: 'metadata.fields.sourceSystem', type: 'string', required: false },
    ],
    isActive: true,
  };
  await prisma.metadataSchema.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: defaultMetadataSchema.code } },
    update: { fields: defaultMetadataSchema.fields as any },
    create: { tenantId: tenant.id, ...defaultMetadataSchema as any },
  });
  console.log(`  ✓ Default metadata schema`);

  // ─── Retention schedules (spec §9.7) ──────────────────────────────────────
  const retentionDefs = [
    { code: 'default-7y', name: 'Default 7-year retention', description: 'Standard business documents retention', triggerKind: 'createdAt', triggerDateField: 'createdAt', retentionDays: 2555, dispositionAction: 'delete', isActive: true },
    { code: 'financial-7y', name: 'Financial records (7 years)', description: 'Financial records retention per standard accounting practice', triggerKind: 'fiscalYearEnd', triggerDateField: 'createdAt', retentionDays: 2555, dispositionAction: 'delete', isActive: true },
    { code: 'legal-hold-indefinite', name: 'Legal hold (indefinite)', description: 'Documents under legal hold are retained indefinitely until release', triggerKind: 'legalHoldRelease', triggerDateField: null, retentionDays: 36500, dispositionAction: 'review', isActive: true },
    { code: 'temporary-90d', name: 'Temporary (90 days)', description: 'Draft and temporary documents', triggerKind: 'createdAt', triggerDateField: 'createdAt', retentionDays: 90, dispositionAction: 'delete', isActive: true },
  ];

  for (const def of retentionDefs) {
    await prisma.retentionSchedule.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: def.code } },
      update: { ...def },
      create: { tenantId: tenant.id, ...def },
    });
  }
  console.log(`  ✓ ${retentionDefs.length} retention schedules`);

  // ─── 14 Guided Tour definitions (spec §10.11) ─────────────────────────────
  const tourDefs: Array<{
    code: string;
    module: string;
    audience: string[];
    priority: number;
    triggerType: string;
    licenseModuleRequired?: string;
    steps: Array<{
      stepOrder: number;
      targetSelector: string;
      titleKey: string;
      bodyKey: string;
      placement: string;
      requiresPermission?: string;
      requiresLicenseModule?: string;
      actionType?: string;
    }>;
  }> = [
    {
      code: 'welcome', module: 'onboarding', audience: ['*'], priority: 10, triggerType: 'first_login',
      steps: [
        { stepOrder: 1, targetSelector: 'app.sidebar', titleKey: 'tour.welcome.step1.title', bodyKey: 'tour.welcome.step1.body', placement: 'end' },
        { stepOrder: 2, targetSelector: 'app.search', titleKey: 'tour.welcome.step2.title', bodyKey: 'tour.welcome.step2.body', placement: 'bottom' },
        { stepOrder: 3, targetSelector: 'app.languageSwitcher', titleKey: 'tour.welcome.step3.title', bodyKey: 'tour.welcome.step3.body', placement: 'bottom' },
        { stepOrder: 4, targetSelector: 'app.themeSwitcher', titleKey: 'tour.welcome.step4.title', bodyKey: 'tour.welcome.step4.body', placement: 'bottom' },
        { stepOrder: 5, targetSelector: 'commandPalette', titleKey: 'tour.welcome.step5.title', bodyKey: 'tour.welcome.step5.body', placement: 'bottom' },
        { stepOrder: 6, targetSelector: 'help.menu', titleKey: 'tour.welcome.step6.title', bodyKey: 'tour.welcome.step6.body', placement: 'top' },
      ],
    },
    {
      code: 'documents', module: 'documents', audience: ['end-user', 'admin'], priority: 20, triggerType: 'first_visit',
      steps: [
        { stepOrder: 1, targetSelector: 'documents.upload', titleKey: 'tour.documents.step1.title', bodyKey: 'tour.documents.step1.body', placement: 'bottom', actionType: 'click' },
        { stepOrder: 2, targetSelector: 'documents.table', titleKey: 'tour.documents.step2.title', bodyKey: 'tour.documents.step2.body', placement: 'top' },
        { stepOrder: 3, targetSelector: 'documents.table', titleKey: 'tour.documents.step3.title', bodyKey: 'tour.documents.step3.body', placement: 'top' },
        { stepOrder: 4, targetSelector: 'documents.table', titleKey: 'tour.documents.step4.title', bodyKey: 'tour.documents.step4.body', placement: 'top' },
      ],
    },
    {
      code: 'search', module: 'search', audience: ['end-user', 'admin'], priority: 30, triggerType: 'first_visit',
      steps: [
        { stepOrder: 1, targetSelector: 'app.search', titleKey: 'tour.search.step1.title', bodyKey: 'tour.search.step1.body', placement: 'bottom' },
        { stepOrder: 2, targetSelector: 'app.search', titleKey: 'tour.search.step2.title', bodyKey: 'tour.search.step2.body', placement: 'bottom' },
      ],
    },
    {
      code: 'records_manager', module: 'retention', audience: ['records-manager', 'admin'], priority: 40, triggerType: 'first_visit',
      steps: [
        { stepOrder: 1, targetSelector: 'retention.schedules', titleKey: 'tour.recordsManager.step1.title', bodyKey: 'tour.recordsManager.step1.body', placement: 'bottom' },
        { stepOrder: 2, targetSelector: 'retention.dispositions', titleKey: 'tour.recordsManager.step2.title', bodyKey: 'tour.recordsManager.step2.body', placement: 'bottom' },
      ],
    },
    {
      code: 'security_officer', module: 'classification', audience: ['security-officer', 'admin'], priority: 40, triggerType: 'first_visit',
      steps: [
        { stepOrder: 1, targetSelector: 'classification.labels', titleKey: 'tour.securityOfficer.step1.title', bodyKey: 'tour.securityOfficer.step1.body', placement: 'bottom' },
      ],
    },
    {
      code: 'auditor', module: 'audit', audience: ['auditor', 'admin'], priority: 50, triggerType: 'first_visit',
      steps: [
        { stepOrder: 1, targetSelector: 'audit.timeline', titleKey: 'tour.auditor.step1.title', bodyKey: 'tour.auditor.step1.body', placement: 'bottom' },
        { stepOrder: 2, targetSelector: 'audit.export', titleKey: 'tour.auditor.step2.title', bodyKey: 'tour.auditor.step2.body', placement: 'bottom' },
      ],
    },
    {
      code: 'administrator', module: 'admin', audience: ['admin'], priority: 60, triggerType: 'first_visit',
      steps: [
        { stepOrder: 1, targetSelector: 'admin.dashboard', titleKey: 'tour.admin.step1.title', bodyKey: 'tour.admin.step1.body', placement: 'bottom' },
        { stepOrder: 2, targetSelector: 'admin.users', titleKey: 'tour.admin.step2.title', bodyKey: 'tour.admin.step2.body', placement: 'bottom' },
        { stepOrder: 3, targetSelector: 'admin.tourConfig', titleKey: 'tour.admin.step3.title', bodyKey: 'tour.admin.step3.body', placement: 'bottom' },
      ],
    },
    {
      code: 'workflow_designer', module: 'workflow', audience: ['workflow-designer', 'admin'], priority: 70, triggerType: 'first_visit',
      steps: [
        { stepOrder: 1, targetSelector: 'workflow.designerCanvas', titleKey: 'tour.workflowDesigner.step1.title', bodyKey: 'tour.workflowDesigner.step1.body', placement: 'bottom' },
      ],
    },
    {
      code: 'scanner', module: 'scanner', audience: ['end-user', 'admin'], priority: 80, triggerType: 'first_visit', licenseModuleRequired: 'scanner-agent',
      steps: [
        { stepOrder: 1, targetSelector: 'scanner.profiles', titleKey: 'tour.scanner.step1.title', bodyKey: 'tour.scanner.step1.body', placement: 'bottom' },
      ],
    },
    {
      code: 'license', module: 'license', audience: ['admin'], priority: 90, triggerType: 'event',
      steps: [
        { stepOrder: 1, targetSelector: 'license.statusWidget', titleKey: 'tour.license.step1.title', bodyKey: 'tour.license.step1.body', placement: 'bottom' },
        { stepOrder: 2, targetSelector: 'license.import', titleKey: 'tour.license.step2.title', bodyKey: 'tour.license.step2.body', placement: 'bottom' },
      ],
    },
    {
      code: 'collaboration', module: 'sharing', audience: ['end-user', 'admin'], priority: 100, triggerType: 'event',
      steps: [
        { stepOrder: 1, targetSelector: 'share.create', titleKey: 'tour.collaboration.step1.title', bodyKey: 'tour.collaboration.step1.body', placement: 'bottom' },
      ],
    },
    {
      code: 'ai_assistant', module: 'ai', audience: ['*'], priority: 110, triggerType: 'event', licenseModuleRequired: 'ai-assistant',
      steps: [
        { stepOrder: 1, targetSelector: 'ai.bubble', titleKey: 'tour.aiAssistant.step1.title', bodyKey: 'tour.aiAssistant.step1.body', placement: 'start' },
        { stepOrder: 2, targetSelector: 'ai.bubble', titleKey: 'tour.aiAssistant.step2.title', bodyKey: 'tour.aiAssistant.step2.body', placement: 'start' },
      ],
    },
    {
      code: 'empty_state', module: 'documents', audience: ['*'], priority: 200, triggerType: 'manual',
      steps: [
        { stepOrder: 1, targetSelector: 'documents.empty', titleKey: 'tour.emptyState.step1.title', bodyKey: 'tour.emptyState.step1.body', placement: 'center' },
      ],
    },
    {
      code: 'marketing', module: 'marketing', audience: ['public'], priority: 999, triggerType: 'manual',
      steps: [
        { stepOrder: 1, targetSelector: 'marketing.hero', titleKey: 'tour.marketing.step1.title', bodyKey: 'tour.marketing.step1.body', placement: 'bottom' },
      ],
    },
  ];

  let tourCount = 0;
  for (const def of tourDefs) {
    const { steps, ...tourFields } = def;
    const tour = await prisma.tourDefinition.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: def.code } },
      update: { ...tourFields, version: 1 },
      create: { tenantId: tenant.id, ...tourFields, version: 1 },
    });
    // Replace all steps (idempotent)
    await prisma.tourStep.deleteMany({ where: { tourId: tour.id } });
    for (const step of steps) {
      await prisma.tourStep.create({
        data: {
          tourId: tour.id,
          ...step,
          titleKey: step.titleKey,
          bodyKey: step.bodyKey,
        },
      });
    }
    tourCount += 1;
  }
  console.log(`  ✓ ${tourCount} tour definitions with steps`);

  // ─── Default AI assistant settings (disabled by default, spec §11.16) ─────
  await prisma.assistantSettings.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      enabled: false,
      allowedRoles: ['admin', 'end-user'],
      allowedTools: [
        'documents.search', 'documents.getSummary', 'documents.getMetadata',
        'documents.getVersions', 'documents.getLockState',
        'workflows.getStatus', 'workflows.getPendingApprovals',
        'audit.getRecentEvents', 'retention.getUpcomingExpiry', 'legalHold.getStatus',
        'license.getStatus', 'help.searchDocumentation',
        'ui.navigateTo', 'tour.start',
        'admin.getHealth', 'admin.getSystemUsage',
      ],
      externalAiAllowed: false,
      localOnlyMode: false,
      chatRetentionDays: 30,
      showCitations: true,
      allowNavigationActions: false,
      allowSuggestedActions: true,
      requireDisclaimer: true,
      rateLimitPerMinute: 20,
      usageQuotaPerDay: 200,
    },
  });
  console.log(`  ✓ Default AI assistant settings (disabled by default)`);

  console.log('\nSeed complete.');
  console.log(`  Admin login: ${ADMIN_EMAIL}`);
  console.log(`  Admin password: ${ADMIN_PASSWORD} (CHANGE ON FIRST LOGIN)`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
