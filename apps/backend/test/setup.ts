/**
 * Backend test setup — runs once before all test files.
 *
 * Initializes a NestJS testing module with the real AppModule,
 * an in-memory PostgreSQL proxy (or a test database via DATABASE_URL),
 * and a mock Redis client.
 *
 * Spec ref: §24 (testing requirements), §24.2 (critical test cases).
 */
import 'reflect-metadata';
import { afterAll, beforeAll } from 'vitest';
import { type NestApplication, NestFactory } from '@nestjs/core';
import { type INestApplication } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
// Use compiled dist (CJS) so decorator metadata is preserved.
// Run `npx nest build` before running tests.
import { AppModule } from '../dist/app.module.js';
import { PrismaService } from '../dist/prisma/prisma.service.js';
import { AuditService } from '../dist/common/audit.service.js';

export let app: INestApplication;
export let prisma: PrismaService;
export let audit: AuditService;

beforeAll(async () => {
  const adapter = new FastifyAdapter({ logger: false });
  app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
    logger: ['error'],
  });
  await app.init();
  await (app.getHttpAdapter().getInstance() as any).ready();
  // Services instantiated directly to avoid Nest DI resolution issues
  // when running tests through vitest (decorator metadata not emitted by esbuild).
  prisma = new PrismaService();
  await prisma.$connect();
  audit = new AuditService(prisma);
}, 60_000);

afterAll(async () => {
  if (prisma) {
    await prisma.$disconnect();
  }
  if (app) {
    await app.close();
  }
});
