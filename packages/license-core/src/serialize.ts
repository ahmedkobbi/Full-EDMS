/**
 * @smart-edms/license-core — file serialization helpers (spec §4.3, §12.5, §12.6)
 *
 * Purpose: convert between in-memory objects and on-disk file contents
 * for the three Smart EDMS license file formats.
 *
 * Conventions:
 *  - On-disk form is pretty-printed JSON (2-space indent, trailing
 *    newline) for human readability. The signature is over the
 *    CANONICAL form (sorted keys, no whitespace), computed at sign
 *    time and stored in the `sig` field, so pretty-printing the file
 *    on disk does not break verification.
 *  - Parsing is strict: unknown top-level keys cause an error. This
 *    matches the `.strict()` Zod schemas in `@smart-edms/schemas`.
 *  - All functions throw on malformed input — there is no silent
 *    failure mode. Callers should wrap parsing in try/catch and
 *    treat any error as "file is invalid; reject".
 */

import type { LicenseArtifact, OfflineRequest, RevocationList } from '@smart-edms/types';

// ---------------------------------------------------------------------------
// .sedmslic
// ---------------------------------------------------------------------------

/**
 * Serialize a `LicenseArtifact` to a `.sedmslic` file content string.
 *
 * The output is pretty-printed JSON with a trailing newline. The
 * embedded `sig` field is the canonical-form signature, so the on-disk
 * formatting does not affect verification.
 */
export function serializeSedmslic(artifact: LicenseArtifact): string {
  assertShape(artifact, 'serializeSedmslic');
  if (artifact.type !== 'sedms.license') {
    throw new Error(`serializeSedmslic: wrong type '${String(artifact.type)}'`);
  }
  return JSON.stringify(artifact, null, 2) + '\n';
}

/**
 * Parse a `.sedmslic` file content string into a `LicenseArtifact`.
 *
 * Performs structural validation; does NOT verify the signature (use
 * `verifyLicenseArtifact()` for that).
 */
export function parseSedmslic(content: string): LicenseArtifact {
  const parsed = parseJsonStrict(content, 'parseSedmslic');
  if (parsed == null || typeof parsed !== 'object') {
    throw new Error('parseSedmslic: content is not a JSON object');
  }
  const obj = parsed as Record<string, unknown>;
  if (obj.type !== 'sedms.license') {
    throw new Error(`parseSedmslic: wrong type '${String(obj.type)}'`);
  }
  if (typeof obj.v !== 'number' || obj.v !== 1) {
    throw new Error(`parseSedmslic: unsupported version ${String(obj.v)}`);
  }
  if (typeof obj.alg !== 'string') {
    throw new Error('parseSedmslic: missing or invalid alg');
  }
  if (typeof obj.kid !== 'string') {
    throw new Error('parseSedmslic: missing or invalid kid');
  }
  if (typeof obj.sig !== 'string') {
    throw new Error('parseSedmslic: missing or invalid sig');
  }
  if (obj.payload == null || typeof obj.payload !== 'object') {
    throw new Error('parseSedmslic: missing or invalid payload');
  }
  return obj as unknown as LicenseArtifact;
}

// ---------------------------------------------------------------------------
// .sedmsreq
// ---------------------------------------------------------------------------

/**
 * Serialize an `OfflineRequest` to a `.sedmsreq` file content string.
 *
 * The output is pretty-printed JSON with a trailing newline for human
 * readability.
 */
export function serializeSedmsreq(req: OfflineRequest): string {
  assertShape(req, 'serializeSedmsreq');
  if (req.type !== 'sedms.request') {
    throw new Error(`serializeSedmsreq: wrong type '${String(req.type)}'`);
  }
  return JSON.stringify(req, null, 2) + '\n';
}

/**
 * Parse a `.sedmsreq` file content string into an `OfflineRequest`.
 */
export function parseSedmsreq(content: string): OfflineRequest {
  const parsed = parseJsonStrict(content, 'parseSedmsreq');
  if (parsed == null || typeof parsed !== 'object') {
    throw new Error('parseSedmsreq: content is not a JSON object');
  }
  const obj = parsed as Record<string, unknown>;
  if (obj.type !== 'sedms.request') {
    throw new Error(`parseSedmsreq: wrong type '${String(obj.type)}'`);
  }
  if (typeof obj.v !== 'number' || obj.v !== 1) {
    throw new Error(`parseSedmsreq: unsupported version ${String(obj.v)}`);
  }
  return obj as unknown as OfflineRequest;
}

// ---------------------------------------------------------------------------
// .sedmscrl
// ---------------------------------------------------------------------------

/**
 * Serialize a `RevocationList` to a `.sedmscrl` file content string.
 */
export function serializeSedmscrl(crl: RevocationList): string {
  assertShape(crl, 'serializeSedmscrl');
  if (crl.type !== 'sedms.crl') {
    throw new Error(`serializeSedmscrl: wrong type '${String(crl.type)}'`);
  }
  return JSON.stringify(crl, null, 2) + '\n';
}

/**
 * Parse a `.sedmscrl` file content string into a `RevocationList`.
 */
export function parseSedmscrl(content: string): RevocationList {
  const parsed = parseJsonStrict(content, 'parseSedmscrl');
  if (parsed == null || typeof parsed !== 'object') {
    throw new Error('parseSedmscrl: content is not a JSON object');
  }
  const obj = parsed as Record<string, unknown>;
  if (obj.type !== 'sedms.crl') {
    throw new Error(`parseSedmscrl: wrong type '${String(obj.type)}'`);
  }
  if (typeof obj.v !== 'number' || obj.v !== 1) {
    throw new Error(`parseSedmscrl: unsupported version ${String(obj.v)}`);
  }
  return obj as unknown as RevocationList;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function assertShape(value: unknown, fn: string): void {
  if (value == null || typeof value !== 'object') {
    throw new Error(`${fn}: input is not an object`);
  }
}

function parseJsonStrict(content: string, fn: string): unknown {
  if (typeof content !== 'string' || content.length === 0) {
    throw new Error(`${fn}: content must be a non-empty string`);
  }
  try {
    return JSON.parse(content);
  } catch (e) {
    throw new Error(
      `${fn}: invalid JSON: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}
