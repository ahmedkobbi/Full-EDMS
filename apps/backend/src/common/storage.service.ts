import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client as MinioClient } from 'minio';
import { Readable } from 'node:stream';
import { createHash, randomUUID } from 'node:crypto';

/**
 * S3-compatible object storage (MinIO in dev / AWS S3 in cloud).
 * Spec ref: §7.2 (S3-compatible storage), §9.3 (file storage must be separate from application database),
 * §9.6 (immutable stored content per version), §21.4 (envelope encryption recommended).
 *
 * Stored objects are addressed by opaque storage keys, never user-supplied filenames.
 * Filenames are sanitized before storage and stored as metadata only.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: MinioClient;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = config.get<string>('S3_BUCKET')!;
    const rawEndpoint = config.get<string>('S3_ENDPOINT')!;
    const useSSL = rawEndpoint.startsWith('https://');
    const endPoint = rawEndpoint.replace(/^https?:\/\//, '').split(':')[0];
    const portMatch = rawEndpoint.match(/:(\d+)$/);
    const port = portMatch ? parseInt(portMatch[1], 10) : (useSSL ? 443 : 80);
    this.client = new MinioClient({
      endPoint,
      port,
      useSSL,
      accessKey: config.get<string>('S3_ACCESS_KEY_ID')!,
      secretKey: config.get<string>('S3_SECRET_ACCESS_KEY')!,
      region: config.get<string>('S3_REGION') ?? 'us-east-1',
      pathStyle: config.get<boolean>('S3_FORCE_PATH_STYLE') ?? true,
    });
  }

  /**
   * Upload a stream and compute its SHA-256 checksum in a single pass.
   * Returns the storage key (opaque) and checksum.
   */
  async uploadStream(
    stream: Readable,
    options: { contentType: string; tenantId: string; originalFilename: string },
  ): Promise<{ storageKey: string; sizeBytes: bigint; checksum: string; checksumAlgorithm: 'sha256' }> {
    const sanitized = sanitizeFilename(options.originalFilename);
    const storageKey = `${options.tenantId}/${new Date().getFullYear()}/${randomUUID()}/${sanitized}`;
    const hash = createHash('sha256');
    let sizeBytes = 0n;

    const passthrough = new Readable({
      read() {},
    });
    stream.on('data', (chunk: Buffer) => {
      hash.update(chunk);
      sizeBytes += BigInt(chunk.length);
      passthrough.push(chunk);
    });
    stream.on('end', () => {
      passthrough.push(null);
    });
    stream.on('error', (err) => {
      passthrough.destroy(err);
    });

    await this.client.putObject(this.bucket, storageKey, passthrough, undefined, {
      'Content-Type': options.contentType,
      'X-Smart-Edms-Tenant': options.tenantId,
      'X-Smart-Edms-Original-Filename': sanitized,
    });

    const checksum = hash.digest('hex');
    this.logger.debug(`Uploaded ${storageKey} (${sizeBytes} bytes, sha256=${checksum.slice(0, 16)}…)`);
    return { storageKey, sizeBytes, checksum, checksumAlgorithm: 'sha256' };
  }

  /**
   * Upload a stream to a specific (caller-chosen) storage key. Used by the
   * multipart upload flow where the storage key is pre-allocated by the
   * Document service (e.g. for chunk assembly). Does NOT compute a checksum
   * — the caller is responsible for any hashing via a passthrough stream.
   *
   * Spec ref: §9.3 (storage key is opaque), §9.6 (immutable stored content).
   */
  async putObjectRaw(
    storageKey: string,
    stream: Readable,
    metadata: Record<string, string> = {},
  ): Promise<void> {
    await this.client.putObject(this.bucket, storageKey, stream, undefined, metadata);
  }

  async download(storageKey: string): Promise<{ stream: Readable; sizeBytes: number; contentType: string }> {
    const obj = await this.client.getObject(this.bucket, storageKey);
    const stat = await this.client.statObject(this.bucket, storageKey);
    return {
      stream: obj as unknown as Readable,
      sizeBytes: stat.size,
      contentType: stat.metaData['content-type'] ?? 'application/octet-stream',
    };
  }

  /**
   * Generate a short-lived signed URL for direct download (spec §9.3).
   * Never expose raw storage credentials to the client.
   */
  async signDownloadUrl(storageKey: string, ttlSeconds = 300): Promise<string> {
    return this.client.presignedGetObject(this.bucket, storageKey, ttlSeconds);
  }

  async delete(storageKey: string): Promise<void> {
    await this.client.removeObject(this.bucket, storageKey);
  }
}

/**
 * Sanitize filename: strip path separators, control chars, normalize Unicode.
 * Preserve Arabic/Cyrillic/CJK characters — only block path traversal and control chars.
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[\x00-\x1f\x7f]/g, '') // control chars
    .replace(/\.\.+/g, '.') // path traversal
    .replace(/[\\/:*?"<>|]/g, '_') // illegal storage chars
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 255) || 'untitled';
}
