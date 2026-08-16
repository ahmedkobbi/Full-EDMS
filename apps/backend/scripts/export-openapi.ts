#!/usr/bin/env tsx
/**
 * Smart EDMS — OpenAPI spec export script (spec §14.1).
 *
 * Generates the OpenAPI 3.0 JSON spec from the NestJS Swagger module
 * and writes it to docs/openapi.json. This allows API consumers to
 * generate client SDKs without running the backend.
 *
 * Usage:
 *   npx tsx scripts/export-openapi.ts
 *
 * Output:
 *   docs/openapi.json — the full OpenAPI 3.0 specification
 */

import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main(): Promise<void> {
  console.log('Smart EDMS — OpenAPI spec export');
  console.log('');

  // Dynamic import to avoid loading the full app until needed
  const { AppModule } = await import('../src/app.module.js');

  const app = await NestFactory.create(AppModule, {
    logger: ['error'],
  });

  const config = new DocumentBuilder()
    .setTitle('Smart EDMS API')
    .setDescription('On-premise Electronic Document Management System — REST API')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('auth')
    .addTag('tenant')
    .addTag('users')
    .addTag('documents')
    .addTag('classification')
    .addTag('workflow')
    .addTag('retention')
    .addTag('legal-hold')
    .addTag('audit')
    .addTag('search')
    .addTag('share')
    .addTag('license')
    .addTag('scanner')
    .addTag('tours')
    .addTag('ai')
    .addTag('admin')
    .addTag('security')
    .addTag('health')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  const outputPath = resolve(__dirname, '../docs/openapi.json');
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(document, null, 2), 'utf8');

  const pathCount = Object.keys(document.paths ?? {}).length;
  const tagCount = (document.tags ?? []).length;

  console.log(`  ✅ OpenAPI spec exported to ${outputPath}`);
  console.log(`     Paths: ${pathCount}`);
  console.log(`     Tags:  ${tagCount}`);
  console.log(`     Size:  ${(JSON.stringify(document).length / 1024).toFixed(1)} KB`);

  await app.close();
  console.log('');
  console.log('Done.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
