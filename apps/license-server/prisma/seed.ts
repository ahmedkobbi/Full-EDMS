/**
 * Smart EDMS — Licensing Server database seed script.
 *
 * Creates the default super-admin user, the Smart EDMS product, the standard
 * plans, and an active signing key reference (the actual PEM file must be
 * generated separately via `pnpm key:generate`).
 *
 * Spec ref: §12.1 (license server entities), §12.3 (license entitlements),
 *           §12.10 (license admin panel — MFA required).
 *
 * Usage:
 *   pnpm --filter @smart-edms/license-server db:seed
 *
 * Environment:
 *   SEED_SUPER_ADMIN_EMAIL     — default: superadmin@smart-edms.example
 *   SEED_SUPER_ADMIN_PASSWORD  — default: ChangeMe!2026 (MUST be changed)
 *   SEED_SUPER_ADMIN_MFA_SECRET — default: generated (printed to console; user enrolls via QR)
 *
 * The seed is idempotent — running it multiple times will not duplicate data.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authenticator as otplibAuthenticator } from 'otplib';

const prisma = new PrismaClient();

const SUPER_ADMIN_EMAIL = process.env.SEED_SUPER_ADMIN_EMAIL ?? 'superadmin@smart-edms.example';
const SUPER_ADMIN_PASSWORD = process.env.SEED_SUPER_ADMIN_PASSWORD ?? 'ChangeMe!2026';

async function main(): Promise<void> {
  console.log('Seeding Smart EDMS Licensing Server database...');

  // ─── Super-admin user ─────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 12);
  const mfaSecret = otplibAuthenticator.generateSecret();

  const superAdmin = await prisma.adminUser.upsert({
    where: { email: SUPER_ADMIN_EMAIL.toLowerCase() },
    update: {},
    create: {
      email: SUPER_ADMIN_EMAIL.toLowerCase(),
      firstName: 'Super',
      lastName: 'Administrator',
      passwordHash,
      roles: ['super_admin'],
      isActive: true,
      mfaSecret,
      mfaEnrolledAt: new Date(),
    },
  });
  console.log(`  ✓ Super-admin: ${superAdmin.email}`);
  console.log(`    MFA secret (enroll via authenticator app): ${mfaSecret}`);
  console.log(`    otpauth URI: otpauth://totp/Smart-EDMS:${superAdmin.email}?secret=${mfaSecret}&issuer=Smart-EDMS`);

  // ─── Default product ──────────────────────────────────────────────────────
  const product = await prisma.product.upsert({
    where: { code: 'smart-edms-core' },
    update: {},
    create: {
      code: 'smart-edms-core',
      name: 'Smart EDMS Core',
      description: 'Premium enterprise-grade, multilingual, on-premise Electronic Document Management System.',
      currentVersion: '1.0.0',
    },
  });
  console.log(`  ✓ Product: ${product.code}`);

  // ─── Standard plans (spec §12.3) ──────────────────────────────────────────
  const planDefs = [
    {
      code: 'team',
      name: 'Team',
      description: 'Small teams up to 25 users',
      features: {
        modules: ['core-edms', 'guided-tour-analytics', 'electron-desktop'],
        aiUsageAllowance: 100,
        supportLevel: 'standard',
      },
      limits: {
        maxUsers: 25,
        maxDevices: 1,
        maxStorageBytes: 1099511627776, // 1 TB
        maxDocuments: 50000,
      },
    },
    {
      code: 'business',
      name: 'Business',
      description: 'Growing organizations up to 200 users',
      features: {
        modules: ['core-edms', 'ai-assistant', 'advanced-search', 'audit-export', 'guided-tour-analytics', 'electron-desktop', 'mobile-access'],
        aiUsageAllowance: 5000,
        supportLevel: 'priority',
      },
      limits: {
        maxUsers: 200,
        maxDevices: 3,
        maxStorageBytes: 10995116277760, // 10 TB
        maxDocuments: 500000,
      },
    },
    {
      code: 'enterprise-on-premise',
      name: 'Enterprise On-Premise',
      description: 'Unlimited users, full feature set, on-premise deployment',
      features: {
        modules: [
          'core-edms', 'ocr', 'omr', 'icr', 'bpmn', 'cmmn', 'dmn',
          'ai-assistant', 'c2pa-provenance', 'dlp', 'advanced-search',
          'hybrid-sync', 'crisis-room', 'physical-digital-twin',
          '3d-knowledge-graph', 'electron-desktop', 'mobile-access',
          'audit-export', 'compliance-export', 'scanner-agent',
          'guided-tour-analytics',
        ],
        aiUsageAllowance: 100000,
        supportLevel: 'enterprise',
      },
      limits: {
        maxUsers: 10000,
        maxDevices: 10,
        maxStorageBytes: 109951162777600, // 100 TB
        maxDocuments: 10000000,
      },
    },
    {
      code: 'trial',
      name: 'Trial',
      description: '14-day trial with limited features',
      features: {
        modules: ['core-edms', 'ai-assistant', 'electron-desktop'],
        aiUsageAllowance: 50,
        supportLevel: 'standard',
      },
      limits: {
        maxUsers: 5,
        maxDevices: 1,
        maxStorageBytes: 10737418240, // 10 GB
        maxDocuments: 100,
      },
    },
  ];

  for (const def of planDefs) {
    await prisma.plan.upsert({
      where: { code: def.code },
      update: { features: def.features as any, limits: def.limits as any, name: def.name, description: def.description },
      create: { productId: product.id, ...def, features: def.features as any, limits: def.limits as any },
    });
  }
  console.log(`  ✓ ${planDefs.length} plans (team, business, enterprise-on-premise, trial)`);

  console.log('\nSeed complete.');
  console.log(`  Super-admin login: ${SUPER_ADMIN_EMAIL}`);
  console.log(`  Super-admin password: ${SUPER_ADMIN_PASSWORD} (CHANGE IMMEDIATELY)`);
  console.log(`  MFA secret: enroll the printed otpauth URI in your authenticator app`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
