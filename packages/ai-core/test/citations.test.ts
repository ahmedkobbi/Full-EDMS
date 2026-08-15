/**
 * @smart-edms/ai-core — citation builder tests (spec §11.8, §11.10).
 *
 * Verifies:
 *  - Documents with `userCanAccess === false` are filtered out entirely.
 *  - The output is projected to the narrow Citation shape (no extra fields).
 *  - The output array is frozen (immutable).
 *  - Empty input produces empty output.
 */
import { describe, it, expect } from 'vitest';
import { buildCitations, type CitationInput } from '../src/index.js';
import type { DocumentId, UUID } from '@smart-edms/types';

function doc(overrides: Partial<CitationInput> = {}): CitationInput {
  return {
    documentId: '00000000-0000-0000-0000-000000000001' as DocumentId,
    versionId: null,
    title: 'Quarterly Report Q4 2024',
    classificationLabelId: '00000000-0000-0000-0000-000000000010' as UUID,
    updatedAt: '2025-01-15T10:30:00.000Z' as never,
    workflowState: 'approved',
    retentionState: 'active',
    legalHoldState: 'none',
    locator: null,
    confidence: 85,
    userCanAccess: true,
    ...overrides,
  };
}

describe('buildCitations — filtering', () => {
  it('keeps documents the user can access', () => {
    const out = buildCitations([doc({ userCanAccess: true })]);
    expect(out.length).toBe(1);
    expect(out[0]!.title).toBe('Quarterly Report Q4 2024');
  });

  it('drops documents the user cannot access', () => {
    const out = buildCitations([
      doc({ userCanAccess: true }),
      doc({ documentId: 'b' as DocumentId, userCanAccess: false }),
      doc({ documentId: 'c' as DocumentId, userCanAccess: true }),
    ]);
    expect(out.length).toBe(2);
    expect(out.map((c) => c.documentId)).toEqual([
      '00000000-0000-0000-0000-000000000001',
      'c',
    ]);
  });

  it('does not leak the existence of restricted documents', () => {
    const out = buildCitations([
      doc({ userCanAccess: false, title: 'TOP SECRET DOCUMENT' }),
    ]);
    expect(out.length).toBe(0);
    // The serialized output must not contain the restricted title.
    expect(JSON.stringify(out)).not.toContain('TOP SECRET DOCUMENT');
  });
});

describe('buildCitations — projection', () => {
  it('projects to the narrow Citation shape', () => {
    const out = buildCitations([doc({
      locator: { page: 3, snippet: 'Revenue increased by 12%' },
    })]);
    expect(out.length).toBe(1);
    const c = out[0]!;
    expect(c.documentId).toBe('00000000-0000-0000-0000-000000000001');
    expect(c.versionId).toBeNull();
    expect(c.title).toBe('Quarterly Report Q4 2024');
    expect(c.classificationLabelId).toBe('00000000-0000-0000-0000-000000000010');
    expect(c.updatedAt).toBe('2025-01-15T10:30:00.000Z');
    expect(c.workflowState).toBe('approved');
    expect(c.retentionState).toBe('active');
    expect(c.legalHoldState).toBe('none');
    expect(c.locator).toEqual({ page: 3, snippet: 'Revenue increased by 12%' });
    expect(c.confidence).toBe(85);
  });

  it('does not carry any fields beyond the Citation type', () => {
    const out = buildCitations([doc()]);
    const c = out[0]!;
    expect(Object.keys(c).sort()).toEqual([
      'classificationLabelId',
      'confidence',
      'documentId',
      'legalHoldState',
      'locator',
      'retentionState',
      'title',
      'updatedAt',
      'versionId',
      'workflowState',
    ]);
  });

  it('preserves null confidence', () => {
    const out = buildCitations([doc({ confidence: null })]);
    expect(out[0]!.confidence).toBeNull();
  });
});

describe('buildCitations — output invariants', () => {
  it('returns a frozen array', () => {
    const out = buildCitations([doc()]);
    expect(Object.isFrozen(out)).toBe(true);
  });

  it('returns an empty array for empty input', () => {
    expect(buildCitations([]).length).toBe(0);
  });

  it('returns an empty array when all documents are inaccessible', () => {
    const out = buildCitations([
      doc({ userCanAccess: false }),
      doc({ userCanAccess: false }),
    ]);
    expect(out.length).toBe(0);
  });

  it('preserves input order', () => {
    const out = buildCitations([
      doc({ documentId: 'a' as DocumentId }),
      doc({ documentId: 'b' as DocumentId }),
      doc({ documentId: 'c' as DocumentId }),
    ]);
    expect(out.map((c) => c.documentId)).toEqual(['a', 'b', 'c']);
  });
});
