#!/usr/bin/env tsx
/**
 * Smart EDMS — OpenSearch index initialization script (spec §9.10).
 *
 * Creates the `smart-edms-documents` index with the correct mappings
 * if it does not already exist. Also configures analyzers for
 * multilingual full-text search.
 *
 * Usage:
 *   pnpm --filter @smart-edms/backend opensearch:init
 *
 * Environment:
 *   OPENSEARCH_URL — e.g. http://admin:admin@localhost:9200
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OPENSEARCH_URL = process.env.OPENSEARCH_URL ?? 'http://admin:admin@localhost:9200';
const INDEX_NAME = 'smart-edms-documents';

async function main(): Promise<void> {
  console.log('Smart EDMS — OpenSearch index initialization');
  console.log(`  URL: ${OPENSEARCH_URL.replace(/\/\/[^@]+@/, '//***@')}`);
  console.log(`  Index: ${INDEX_NAME}`);
  console.log('');

  // Load mappings
  const mappingsPath = resolve(__dirname, '../../infra/opensearch/index-mappings.json');
  let mappings: Record<string, unknown>;
  try {
    mappings = JSON.parse(readFileSync(mappingsPath, 'utf8'));
    console.log(`  Loaded mappings from ${mappingsPath}`);
  } catch (err) {
    console.error(`  Failed to load mappings: ${(err as Error).message}`);
    process.exit(1);
  }

  // Check if index already exists
  try {
    const checkResp = await fetch(`${OPENSEARCH_URL}/${INDEX_NAME}`, {
      method: 'HEAD',
    });
    if (checkResp.ok) {
      console.log(`  Index '${INDEX_NAME}' already exists — skipping creation.`);
      return;
    }
  } catch {
    // OpenSearch not reachable — continue (will fail on create)
  }

  // Create the index
  try {
    const createResp = await fetch(`${OPENSEARCH_URL}/${INDEX_NAME}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mappings),
    });

    if (createResp.ok) {
      const body = await createResp.text();
      console.log(`  ✅ Index '${INDEX_NAME}' created successfully.`);
      console.log(`  Response: ${body.slice(0, 200)}`);
    } else {
      const errorBody = await createResp.text();
      console.error(`  ❌ Failed to create index (HTTP ${createResp.status}): ${errorBody}`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`  ❌ Failed to connect to OpenSearch: ${(err as Error).message}`);
    console.error('  Make sure OpenSearch is running and OPENSEARCH_URL is set correctly.');
    process.exit(1);
  }

  // Verify index
  try {
    const verifyResp = await fetch(`${OPENSEARCH_URL}/${INDEX_NAME}/_count`, {
      method: 'GET',
    });
    if (verifyResp.ok) {
      const body = await verifyResp.json() as { count: number };
      console.log(`  ✅ Index verified — document count: ${body.count}`);
    }
  } catch {
    // Non-fatal
  }

  console.log('');
  console.log('OpenSearch initialization complete.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
