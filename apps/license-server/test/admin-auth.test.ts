/**
 * License-server admin authentication tests.
 *
 * Spec ref: §12.10 (license admin panel — secure login, MFA required),
 * §21.2 (authentication — MFA, lockout, step-up).
 *
 * These tests verify the AdminAuthService's login + MFA + step-up flow
 * without needing a running server (mocked Prisma + Redis).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { authenticator as otplibAuthenticator } from 'otplib';
import { AdminAuthService } from '../src/modules/admin-auth/admin-auth.service.js';

// Mock PrismaService
const mockPrisma = {
  adminUser: {
    findUnique: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  },
};

// Mock RedisService
const mockRedis = {
  connection: {
    set: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
  },
};

// Mock AuditService
const mockAudit = {
  record: vi.fn(),
};

// Mock JwtService
const mockJwt = {
  signAsync: vi.fn(),
  verifyAsync: vi.fn(),
  decode: vi.fn(),
};

// Mock ConfigService
const mockConfig = {
  get: vi.fn((key: string) => {
    if (key === 'JWT_SECRET') return 'test-secret-at-least-32-characters-long';
    if (key === 'LOG_LEVEL') return 'error';
    return undefined;
  }),
};

describe('AdminAuthService (license-server)', () => {
  let service: AdminAuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AdminAuthService(
      mockPrisma as any,
      mockJwt as any,
      mockAudit as any,
      mockRedis as any,
    );
  });

  describe('login', () => {
    it('returns MFA ticket for valid credentials', async () => {
      const passwordHash = await bcrypt.hash('ValidPassword!2026', 12);
      const mfaSecret = otplibAuthenticator.generateSecret();
      mockPrisma.adminUser.findUnique.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@example.com',
        passwordHash,
        isActive: true,
        mfaSecret,
        failedLoginCount: 0,
        lockedUntil: null,
        roles: ['admin'],
        firstName: 'Admin',
        lastName: 'User',
      });
      mockRedis.connection.set.mockResolvedValue('OK');

      const result = await service.login(
        { email: 'admin@example.com', password: 'ValidPassword!2026' },
        { ip: '127.0.0.1', userAgent: 'test' },
      );

      expect(result.mfaRequired).toBe(true);
      expect(result.mfaTicket).toBeTruthy();
      expect(result.mfaTicket).toHaveLength(64); // 32 bytes hex
      expect(mockRedis.connection.set).toHaveBeenCalledWith(
        `admin:mfa:ticket:${result.mfaTicket}`,
        expect.any(String),
        'EX',
        300,
      );
    });

    it('throws for non-existent admin', async () => {
      mockPrisma.adminUser.findUnique.mockResolvedValue(null);

      await expect(
        service.login(
          { email: 'nobody@example.com', password: 'anypassword123' },
          { ip: '127.0.0.1', userAgent: 'test' },
        ),
      ).rejects.toThrow();
      expect(mockAudit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'admin.login',
          result: 'deny',
          reason: 'admin_not_found_or_inactive',
        }),
      );
    });

    it('throws for inactive admin', async () => {
      mockPrisma.adminUser.findUnique.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@example.com',
        passwordHash: '$2a$12$dummy',
        isActive: false,
        mfaSecret: 'secret',
      });

      await expect(
        service.login(
          { email: 'admin@example.com', password: 'anypassword123' },
          {},
        ),
      ).rejects.toThrow();
    });

    it('throws for locked account', async () => {
      mockPrisma.adminUser.findUnique.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@example.com',
        passwordHash: await bcrypt.hash('ValidPassword!2026', 12),
        isActive: true,
        mfaSecret: 'secret',
        lockedUntil: new Date(Date.now() + 10 * 60 * 1000), // 10 min in future
      });

      await expect(
        service.login(
          { email: 'admin@example.com', password: 'ValidPassword!2026' },
          {},
        ),
      ).rejects.toThrow();
      expect(mockAudit.record).toHaveBeenCalledWith(
        expect.objectContaining({ reason: 'account_locked' }),
      );
    });

    it('throws for wrong password and increments failed login count', async () => {
      mockPrisma.adminUser.findUnique.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@example.com',
        passwordHash: await bcrypt.hash('CorrectPassword!2026', 12),
        isActive: true,
        mfaSecret: 'secret',
        failedLoginCount: 0,
        lockedUntil: null,
      });
      mockPrisma.adminUser.update.mockResolvedValue({ failedLoginCount: 1 });

      await expect(
        service.login(
          { email: 'admin@example.com', password: 'WrongPassword!2026' },
          {},
        ),
      ).rejects.toThrow();
      expect(mockPrisma.adminUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'admin-1' },
          data: { failedLoginCount: { increment: 1 } },
        }),
      );
    });

    it('throws if MFA not enrolled', async () => {
      mockPrisma.adminUser.findUnique.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@example.com',
        passwordHash: await bcrypt.hash('ValidPassword!2026', 12),
        isActive: true,
        mfaSecret: null,
        failedLoginCount: 0,
        lockedUntil: null,
      });

      await expect(
        service.login(
          { email: 'admin@example.com', password: 'ValidPassword!2026' },
          {},
        ),
      ).rejects.toThrow();
      expect(mockAudit.record).toHaveBeenCalledWith(
        expect.objectContaining({ reason: 'mfa_not_enrolled' }),
      );
    });
  });

  describe('verifyMfa', () => {
    it('returns tokens for valid MFA code', async () => {
      const mfaSecret = otplibAuthenticator.generateSecret();
      const validCode = otplibAuthenticator.generate(mfaSecret);

      mockRedis.connection.get.mockResolvedValue(
        JSON.stringify({ adminId: 'admin-1', email: 'admin@example.com' }),
      );
      mockPrisma.adminUser.findUnique.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@example.com',
        isActive: true,
        mfaSecret,
        firstName: 'Admin',
        lastName: 'User',
        roles: ['admin'],
      });
      mockRedis.connection.del.mockResolvedValue(1);
      mockJwt.signAsync.mockResolvedValueOnce('access-token').mockResolvedValueOnce('refresh-token');

      const result = await service.verifyMfa(
        { mfaTicket: 'valid-ticket', code: validCode },
        {},
      );

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.expiresIn).toBe(900);
      expect(result.admin.email).toBe('admin@example.com');
      expect(mockRedis.connection.del).toHaveBeenCalledWith('admin:mfa:ticket:valid-ticket');
    });

    it('throws for expired ticket', async () => {
      mockRedis.connection.get.mockResolvedValue(null);

      await expect(
        service.verifyMfa({ mfaTicket: 'expired', code: '123456' }, {}),
      ).rejects.toThrow();
    });

    it('throws for invalid TOTP code', async () => {
      const mfaSecret = otplibAuthenticator.generateSecret();
      mockRedis.connection.get.mockResolvedValue(
        JSON.stringify({ adminId: 'admin-1', email: 'admin@example.com' }),
      );
      mockPrisma.adminUser.findUnique.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@example.com',
        isActive: true,
        mfaSecret,
        roles: ['admin'],
      });

      await expect(
        service.verifyMfa({ mfaTicket: 'valid-ticket', code: '000000' }, {}),
      ).rejects.toThrow();
      expect(mockAudit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'admin.mfa.verify',
          result: 'deny',
          reason: 'invalid_mfa_code',
        }),
      );
    });
  });

  describe('stepUp', () => {
    it('returns step-up token for valid TOTP', async () => {
      const mfaSecret = otplibAuthenticator.generateSecret();
      const validCode = otplibAuthenticator.generate(mfaSecret);

      mockPrisma.adminUser.findUnique.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@example.com',
        isActive: true,
        mfaSecret,
        roles: ['admin'],
      });
      mockJwt.signAsync.mockResolvedValue('step-up-token');

      const result = await service.stepUp('admin-1', { code: validCode }, {});

      expect(result.stepUpToken).toBe('step-up-token');
      expect(result.expiresIn).toBe(300);
    });

    it('throws for invalid TOTP', async () => {
      const mfaSecret = otplibAuthenticator.generateSecret();
      mockPrisma.adminUser.findUnique.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@example.com',
        isActive: true,
        mfaSecret,
        roles: ['admin'],
      });

      await expect(
        service.stepUp('admin-1', { code: '000000' }, {}),
      ).rejects.toThrow();
      expect(mockAudit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'admin.mfa.step_up',
          result: 'deny',
        }),
      );
    });
  });

  describe('refresh', () => {
    it('returns new token pair for valid refresh token', async () => {
      mockJwt.verifyAsync.mockResolvedValue({
        sub: 'admin-1',
        email: 'admin@example.com',
        roles: ['admin'],
        type: 'refresh',
      });
      mockPrisma.adminUser.findUnique.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@example.com',
        isActive: true,
        roles: ['admin'],
      });
      mockJwt.signAsync.mockResolvedValueOnce('new-access').mockResolvedValueOnce('new-refresh');

      const result = await service.refresh({ refreshToken: 'valid-refresh' });

      expect(result.accessToken).toBe('new-access');
      expect(result.refreshToken).toBe('new-refresh');
    });

    it('throws for invalid refresh token', async () => {
      mockJwt.verifyAsync.mockRejectedValue(new Error('invalid'));

      await expect(
        service.refresh({ refreshToken: 'invalid' }),
      ).rejects.toThrow();
    });

    it('throws for access token used as refresh', async () => {
      mockJwt.verifyAsync.mockResolvedValue({
        sub: 'admin-1',
        type: 'access', // wrong type
      });

      await expect(
        service.refresh({ refreshToken: 'access-token' }),
      ).rejects.toThrow();
    });
  });
});
