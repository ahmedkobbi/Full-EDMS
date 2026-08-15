/**
 * Backend test setup — runs once before all test files.
 *
 * Initializes a NestJS testing module with the real AppModule,
 * an in-memory PostgreSQL proxy (or a test database via DATABASE_URL),
 * and a mock Redis client.
 *
 * Spec ref: §24 (testing requirements), §24.2 (critical test cases).
 */
import { beforeAll, afterAll } from 'vitest';
import { type NestApplication, NestFactory } from '@nestjs/core';
import { type INestApplication } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

export let app: INestApplication;
export let prisma: PrismaService;

beforeAll(async () => {
  const adapter = new FastifyAdapter({ logger: false });
  app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
    logger: ['error'],
  });
  await app.init();
  await (app.getHttpAdapter().getInstance() as any).ready();
  prisma = app.get(PrismaService);
}, 60_000);

afterAll(async () => {
  if (app) {
    await app.close();
  }
});
