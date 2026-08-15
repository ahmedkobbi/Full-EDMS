/**
 * Share access OTP verification service (spec §9.11).
 *
 * For share links with recipientEmail, the recipient must verify their
 * identity via a one-time password (OTP) sent to their email before
 * accessing the document.
 *
 * Flow:
 *   1. Recipient opens share link → enters their email
 *   2. Server sends a 6-digit OTP to that email (if it matches the share's recipientEmail)
 *   3. Recipient enters the OTP → server validates + issues a short-lived access session
 *   4. Access session stored in Redis (10min TTL)
 *
 * Spec ref: §9.11 (external recipient verification).
 */
import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../common/redis.service.js';
import { randomInt } from 'node:crypto';

@Injectable()
export class ShareOtpService {
  private readonly logger = new Logger(ShareOtpService.name);
  private static readonly OTP_TTL = 600; // 10 minutes
  private static readonly SESSION_TTL = 600; // 10 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Initiate OTP verification for a share link.
   * Sends a 6-digit code to the recipient's email if it matches the share's recipientEmail.
   */
  async initiateOtp(token: string, email: string): Promise<{ otpSent: boolean }> {
    const share = await this.prisma.shareLink.findFirst({
      where: { token, isActive: true },
    });
    if (!share) throw new NotFoundException({ messageKey: 'errors.SHARE_NOT_FOUND' });

    // Check if share is expired
    if (share.expiresAt && share.expiresAt < new Date()) {
      throw new ForbiddenException({ messageKey: 'errors.SHARE_EXPIRED' });
    }

    // Check max views
    if (share.maxViews && share.viewCount >= share.maxViews) {
      throw new ForbiddenException({ messageKey: 'errors.SHARE_MAX_VIEWS_REACHED' });
    }

    // Verify email matches recipientEmail (if set)
    if (share.recipientEmail && share.recipientEmail.toLowerCase() !== email.toLowerCase()) {
      // Don't reveal whether the email is wrong — just say "OTP sent" (security)
      this.logger.warn(`Share OTP email mismatch: token=${token.slice(0, 8)} expected=${share.recipientEmail} got=${email}`);
      return { otpSent: false };
    }

    // Generate 6-digit OTP
    const otp = String(randomInt(100000, 999999));
    const otpKey = `share:otp:${token}`;

    await this.redis.setJson(otpKey, {
      otp,
      email: email.toLowerCase(),
      attempts: 0,
      createdAt: new Date().toISOString(),
    }, ShareOtpService.OTP_TTL);

    // Enqueue email (would go through EmailService)
    await this.redis.connection.publish(
      'smart-edms:internal:email',
      JSON.stringify({
        to: email,
        template: 'share_otp',
        vars: { code: otp, expiresIn: '10 minutes' },
        locale: 'en',
      }),
    );

    this.logger.log(`Share OTP sent: token=${token.slice(0, 8)} email=${email}`);
    return { otpSent: true };
  }

  /**
   * Verify the OTP and issue a short-lived access session.
   */
  async verifyOtp(token: string, email: string, otp: string): Promise<{
    sessionId: string;
    documentId: string;
    permission: string;
    expiresAt: string;
  } | null> {
    const otpKey = `share:otp:${token}`;
    const otpData = await this.redis.getJson<{ otp: string; email: string; attempts: number }>(otpKey);
    if (!otpData) {
      throw new NotFoundException({ messageKey: 'errors.OTP_EXPIRED' });
    }

    // Check email match
    if (otpData.email !== email.toLowerCase()) {
      return null;
    }

    // Check attempts (max 5)
    if (otpData.attempts >= 5) {
      await this.redis.invalidate(otpKey);
      throw new ForbiddenException({ messageKey: 'errors.OTP_MAX_ATTEMPTS' });
    }

    // Verify OTP
    if (otpData.otp !== otp) {
      otpData.attempts += 1;
      await this.redis.setJson(otpKey, otpData, ShareOtpService.OTP_TTL);
      this.logger.warn(`Share OTP mismatch: token=${token.slice(0, 8)} attempts=${otpData.attempts}`);
      return null;
    }

    // OTP verified — burn it
    await this.redis.invalidate(otpKey);

    // Get the share link details
    const share = await this.prisma.shareLink.findFirst({
      where: { token, isActive: true },
    });
    if (!share) throw new NotFoundException({ messageKey: 'errors.SHARE_NOT_FOUND' });

    // Increment view count
    await this.prisma.shareLink.update({
      where: { id: share.id },
      data: { viewCount: { increment: 1 } },
    });

    // Issue a short-lived access session
    const sessionId = `${token}:${Date.now().toString(36)}`;
    const expiresAt = new Date(Date.now() + ShareOtpService.SESSION_TTL * 1000);

    await this.redis.setJson(`share:session:${sessionId}`, {
      shareLinkId: share.id,
      documentId: share.documentId,
      permission: share.permission,
      email: email.toLowerCase(),
      expiresAt: expiresAt.toISOString(),
    }, ShareOtpService.SESSION_TTL);

    this.logger.log(`Share OTP verified: token=${token.slice(0, 8)} session=${sessionId.slice(0, 16)}`);
    return {
      sessionId,
      documentId: share.documentId,
      permission: share.permission,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Validate a share access session (called by the public document viewer).
   */
  async validateSession(sessionId: string): Promise<{
    documentId: string;
    permission: string;
  } | null> {
    const session = await this.redis.getJson<{
      documentId: string;
      permission: string;
      expiresAt: string;
    }>(`share:session:${sessionId}`);
    if (!session) return null;
    if (new Date(session.expiresAt) < new Date()) {
      await this.redis.invalidate(`share:session:${sessionId}`);
      return null;
    }
    return { documentId: session.documentId, permission: session.permission };
  }
}
