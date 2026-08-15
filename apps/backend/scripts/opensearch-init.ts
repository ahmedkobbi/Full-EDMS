/**
 * OpenSearch index initialization script.
 *
 * Creates the `smart-edms-documents` index with proper Arabic-aware analysis
 * (spec §9.10 — Arabic tokenization, normalization, tashkeel removal,
 * hamza/alef/taa marbuta normalization, Arabic stopwords + synonyms).
 *
 * Run on startup or manually:
 *   pnpm --filter @smart-edms/backend opensearch:init
 *
 * Spec ref: §9.10 (search, DLA, flex search), §16.7 (Arabic search requirements).
 */
import { Client as OpenSearchClient } from '@opensearch-project/opensearch';

const OPENSEARCH_URL = process.env.OPENSEARCH_URL ?? 'http://localhost:9200';
const INDEX_NAME = process.env.OPENSEARCH_INDEX ?? 'smart-edms-documents';

async function main(): Promise<void> {
  const client = new OpenSearchClient({ node: OPENSEARCH_URL });

  // Check if index already exists
  const exists = await client.indices.exists({ index: INDEX_NAME });
  if (exists.body) {
    console.log(`Index ${INDEX_NAME} already exists — skipping creation.`);
    return;
  }

  console.log(`Creating index ${INDEX_NAME}...`);

  await client.indices.create({
    index: INDEX_NAME,
    body: {
      settings: {
        index: {
          number_of_shards: 3,
          number_of_replicas: 1,
          analysis: {
            analyzer: {
              // Arabic analyzer with tashkeel removal + normalization
              smart_edms_arabic: {
                type: 'custom',
                tokenizer: 'standard',
                filter: [
                  'lowercase',
                  'arabic_normalization',
                  'smart_edms_tashkeel_remove',
                  'smart_edms_alef_normalize',
                  'smart_edms_hamza_normalize',
                  'smart_edms_taa_marbuta_normalize',
                  'smart_edms_alef_maksura_normalize',
                  'arabic_stop',
                  'arabic_keywords',
                  'arabic_stemmer',
                ],
              },
              // Latin analyzer with proper plural handling
              smart_edms_latin: {
                type: 'custom',
                tokenizer: 'standard',
                filter: ['lowercase', 'stop', 'snowball'],
              },
              // CJK analyzer (Chinese)
              smart_edms_cjk: {
                type: 'custom',
                tokenizer: 'icu_tokenizer',
                filter: ['lowercase', 'icu_normalizer'],
              },
            },
            filter: {
              smart_edms_tashkeel_remove: {
                type: 'pattern_replace',
                pattern: '[\u064B-\u065F\u0670]',
                replacement: '',
              },
              smart_edms_alef_normalize: {
                type: 'pattern_replace',
                pattern: '[\u0622\u0623\u0625]',
                replacement: '\u0627', // normalize آأإ → ا
              },
              smart_edms_hamza_normalize: {
                type: 'pattern_replace',
                pattern: '\u0624',
                replacement: '\u0648', // normalize ؤ → و
              },
              smart_edms_taa_marbuta_normalize: {
                type: 'pattern_replace',
                pattern: '\u0629',
                replacement: '\u0647', // normalize ة → ه
              },
              smart_edms_alef_maksura_normalize: {
                type: 'pattern_replace',
                pattern: '\u0649',
                replacement: '\u064A', // normalize ى → ي
              },
            },
          },
        },
      },
      mappings: {
        properties: {
          tenantId: { type: 'keyword' },
          documentId: { type: 'keyword' },
          versionId: { type: 'keyword' },
          title: {
            type: 'text',
            fields: {
              ar: { type: 'text', analyzer: 'smart_edms_arabic' },
              latin: { type: 'text', analyzer: 'smart_edms_latin' },
              cjk: { type: 'text', analyzer: 'smart_edms_cjk' },
              keyword: { type: 'keyword', ignore_above: 256 },
            },
          },
          description: {
            type: 'text',
            fields: {
              ar: { type: 'text', analyzer: 'smart_edms_arabic' },
              latin: { type: 'text', analyzer: 'smart_edms_latin' },
              cjk: { type: 'text', analyzer: 'smart_edms_cjk' },
            },
          },
          content: {
            type: 'text',
            fields: {
              ar: { type: 'text', analyzer: 'smart_edms_arabic' },
              latin: { type: 'text', analyzer: 'smart_edms_latin' },
              cjk: { type: 'text', analyzer: 'smart_edms_cjk' },
            },
          },
          documentType: { type: 'keyword' },
          classificationId: { type: 'keyword' },
          sensitivityLevel: { type: 'integer' },
          contentLanguage: { type: 'keyword' },
          textDirection: { type: 'keyword' },
          tags: { type: 'keyword' },
          metadata: { type: 'object', enabled: true },
          createdByUserId: { type: 'keyword' },
          createdAt: { type: 'date' },
          updatedAt: { type: 'date' },
          // Permission-aware filter fields (spec §9.10 — no existence leakage)
          accessibleByUserIds: { type: 'keyword' },
          accessibleByRoleCodes: { type: 'keyword' },
        },
      },
    },
  });

  console.log(`Index ${INDEX_NAME} created successfully.`);
}

main().catch((err) => {
  console.error('OpenSearch init failed:', err);
  process.exit(1);
});
