/**
 * @smart-edms/config — loader + schema tests.
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  DatabaseConfigSchema,
  RedisConfigSchema,
  JwtConfigSchema,
  StorageConfigSchema,
  LicenseConfigSchema,
  AiConfigSchema,
  loadConfig,
  safeLoadConfig,
  ConfigValidationError,
} from '../src/index.js';

describe('DatabaseConfigSchema', () => {
  it('parses a valid config with defaults', () => {
    const out = loadConfig(DatabaseConfigSchema, {
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/edms',
    });
    expect(out.DATABASE_URL).toBe('postgresql://user:pass@localhost:5432/edms');
    expect(out.DATABASE_POOL_MAX).toBe(20);
    expect(out.DATABASE_POOL_TIMEOUT_MS).toBe(30_000);
    expect(out.DATABASE_SSL).toBe(false);
  });

  it('coerces numeric and boolean string values', () => {
    const out = loadConfig(DatabaseConfigSchema, {
      DATABASE_URL: 'postgres://localhost/edms',
      DATABASE_POOL_MAX: '50',
      DATABASE_SSL: 'true',
    });
    expect(out.DATABASE_POOL_MAX).toBe(50);
    expect(out.DATABASE_SSL).toBe(true);
  });

  it('rejects non-postgres URLs', () => {
    const result = safeLoadConfig(DatabaseConfigSchema, { DATABASE_URL: 'mysql://localhost/db' });
    expect(result.success).toBe(false);
  });

  it('rejects missing DATABASE_URL', () => {
    const result = safeLoadConfig(DatabaseConfigSchema, {});
    expect(result.success).toBe(false);
  });
});

describe('RedisConfigSchema', () => {
  it('parses a valid redis URL with defaults', () => {
    const out = loadConfig(RedisConfigSchema, { REDIS_URL: 'redis://localhost:6379' });
    expect(out.REDIS_MAX_RETRIES).toBe(10);
    expect(out.REDIS_KEY_PREFIX).toBe('smart-edms:');
  });

  it('accepts rediss:// (TLS)', () => {
    const out = loadConfig(RedisConfigSchema, { REDIS_URL: 'rediss://redis.example.com:6380' });
    expect(out.REDIS_URL).toBe('rediss://redis.example.com:6380');
  });

  it('rejects non-redis URLs', () => {
    expect(safeLoadConfig(RedisConfigSchema, { REDIS_URL: 'http://localhost:6379' }).success).toBe(false);
  });
});

describe('JwtConfigSchema', () => {
  it('accepts a 32-char secret in development', () => {
    const out = loadConfig(JwtConfigSchema, {
      JWT_SECRET: 'a'.repeat(32),
    });
    expect(out.JWT_ISSUER).toBe('smart-edms');
    expect(out.JWT_ACCESS_TTL_SECONDS).toBe(900);
  });

  it('rejects secrets shorter than 32 chars', () => {
    expect(safeLoadConfig(JwtConfigSchema, { JWT_SECRET: 'short' }).success).toBe(false);
  });

  it('requires 64-char secret in production', () => {
    const shortResult = safeLoadConfig(JwtConfigSchema, {
      NODE_ENV: 'production',
      JWT_SECRET: 'a'.repeat(32),
    });
    expect(shortResult.success).toBe(false);
    if (!shortResult.success) {
      expect(shortResult.error.issues.some((i) => i.path === 'JWT_SECRET')).toBe(true);
    }

    const longResult = safeLoadConfig(JwtConfigSchema, {
      NODE_ENV: 'production',
      JWT_SECRET: 'a'.repeat(64),
    });
    expect(longResult.success).toBe(true);
  });
});

describe('StorageConfigSchema', () => {
  it('parses a valid MinIO config', () => {
    const out = loadConfig(StorageConfigSchema, {
      S3_ENDPOINT: 'https://minio.local',
      S3_BUCKET: 'edms-documents',
    });
    expect(out.S3_FORCE_PATH_STYLE).toBe(true);
    expect(out.S3_REGION).toBe('us-east-1');
  });

  it('requires credentials in production', () => {
    const result = safeLoadConfig(StorageConfigSchema, {
      NODE_ENV: 'production',
      S3_ENDPOINT: 'https://s3.amazonaws.com',
      S3_BUCKET: 'edms-docs',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path === 'S3_ACCESS_KEY_ID')).toBe(true);
      expect(result.error.issues.some((i) => i.path === 'S3_SECRET_ACCESS_KEY')).toBe(true);
    }
  });

  it('rejects invalid bucket names', () => {
    expect(safeLoadConfig(StorageConfigSchema, {
      S3_ENDPOINT: 'https://s3.amazonaws.com',
      S3_BUCKET: 'Invalid_Bucket',
    }).success).toBe(false);
  });
});

describe('LicenseConfigSchema', () => {
  it('parses a valid config with defaults', () => {
    const out = loadConfig(LicenseConfigSchema, {
      LICENSE_SERVER_URL: 'https://licenses.smart-edms.example',
    });
    expect(out.LICENSE_HEARTBEAT_INTERVAL_SECONDS).toBe(3600);
    expect(out.LICENSE_GRACE_PERIOD_DAYS).toBe(7);
  });

  it('requires public key path in production', () => {
    const result = safeLoadConfig(LicenseConfigSchema, {
      NODE_ENV: 'production',
      LICENSE_SERVER_URL: 'https://licenses.smart-edms.example',
    });
    expect(result.success).toBe(false);
  });
});

describe('AiConfigSchema', () => {
  it('parses "none" mode with no endpoints', () => {
    const out = loadConfig(AiConfigSchema, { AI_PROVIDER: 'none' });
    expect(out.AI_PROVIDER).toBe('none');
    expect(out.AI_REQUEST_TIMEOUT_MS).toBe(30_000);
  });

  it('requires external URL+key for external mode', () => {
    const result = safeLoadConfig(AiConfigSchema, { AI_PROVIDER: 'external' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path === 'AI_EXTERNAL_API_URL')).toBe(true);
      expect(result.error.issues.some((i) => i.path === 'AI_EXTERNAL_API_KEY')).toBe(true);
    }
  });

  it('requires local URL for local mode', () => {
    const result = safeLoadConfig(AiConfigSchema, { AI_PROVIDER: 'local' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path === 'AI_LOCAL_API_URL')).toBe(true);
    }
  });

  it('accepts a complete hybrid config', () => {
    const out = loadConfig(AiConfigSchema, {
      AI_PROVIDER: 'hybrid',
      AI_EXTERNAL_API_URL: 'https://api.openai.com',
      AI_EXTERNAL_API_KEY: 'sk-test',
      AI_LOCAL_API_URL: 'http://localhost:8080',
    });
    expect(out.AI_PROVIDER).toBe('hybrid');
  });
});

describe('loadConfig', () => {
  it('returns typed data on success', () => {
    const schema = z.object({ FOO: z.string().min(1) });
    const out = loadConfig(schema, { FOO: 'bar' });
    expect(out.FOO).toBe('bar');
  });

  it('throws ConfigValidationError on failure', () => {
    const schema = z.object({ FOO: z.string().min(1), BAR: z.string().min(1) });
    expect(() => loadConfig(schema, { FOO: '', BAR: 'ok' })).toThrow(ConfigValidationError);
  });

  it('error message lists every issue', () => {
    const schema = z.object({ FOO: z.string().min(1), BAR: z.string().min(1) });
    try {
      loadConfig(schema, { FOO: '', BAR: '' });
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ConfigValidationError);
      const err = e as ConfigValidationError;
      expect(err.issues.length).toBeGreaterThanOrEqual(2);
      expect(err.message).toContain('FOO');
      expect(err.message).toContain('BAR');
    }
  });
});

describe('safeLoadConfig', () => {
  it('returns success:true on valid input', () => {
    const schema = z.object({ X: z.string() });
    const result = safeLoadConfig(schema, { X: 'y' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.X).toBe('y');
  });

  it('returns success:false with error on invalid input', () => {
    const schema = z.object({ X: z.string().min(5) });
    const result = safeLoadConfig(schema, { X: 'abc' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBeInstanceOf(ConfigValidationError);
  });
});
