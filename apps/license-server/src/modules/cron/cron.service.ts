import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LicenseService } from '../license/license.service.js';
import { TrialService } from '../trial/trial.service.js';
import { HeartbeatService } from '../heartbeat/heartbeat.service.js';
import { RevocationService } from '../revocation/revocation.service.js';

/**
 * Scheduled jobs for the licensing server.
 *
 * Spec ref:
 *   §12.4 — CRL refresh (default every 24h, plus on-demand after each revocation)
 *   §12.9 — flag stale deployments (heartbeat failures)
 *   §12.10 — trials auto-expire when duration elapses
 *   §12 (license.expired webhook) — licenses auto-expire when endDate passes
 *
 * Uses @nestjs/schedule's @Cron decorator. The ScheduleModule is
 * registered in AppModule.
 */
@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private readonly licenseService: LicenseService,
    private readonly trialService: TrialService,
    private readonly heartbeatService: HeartbeatService,
    private readonly revocationService: RevocationService,
  ) {}

  /**
   * Every hour: expire licenses whose endDate has passed.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async expireLicenses(): Promise<void> {
    try {
      const result = await this.licenseService.expireDueLicenses();
      if (result.expired > 0) {
        this.logger.log(`Cron expireLicenses: expired ${result.expired} licenses`);
      }
    } catch (err) {
      this.logger.error(`Cron expireLicenses failed: ${(err as Error).message}`);
    }
  }

  /**
   * Every hour: expire trials whose endDate has passed.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async expireTrials(): Promise<void> {
    try {
      const result = await this.trialService.expireDueTrials();
      if (result.expired > 0) {
        this.logger.log(`Cron expireTrials: expired ${result.expired} trials`);
      }
    } catch (err) {
      this.logger.error(`Cron expireTrials failed: ${(err as Error).message}`);
    }
  }

  /**
   * Every 15 minutes: flag deployments that have missed heartbeats.
   * Spec ref: §12.9 — "Repeated heartbeat failures flag the license for review."
   */
  @Cron('0 */15 * * * *')
  async flagStaleDeployments(): Promise<void> {
    try {
      const result = await this.heartbeatService.flagStaleDeployments();
      if (result.flagged > 0) {
        this.logger.log(`Cron flagStaleDeployments: flagged ${result.flagged} stale deployments`);
      }
    } catch (err) {
      this.logger.error(`Cron flagStaleDeployments failed: ${(err as Error).message}`);
    }
  }

  /**
   * Every 24 hours: rebuild + sign the CRL (even if no new revocations).
   * This rotates the `generatedAt` + `nextExpectedAt` timestamps so
   * on-prem backends know the licensing server is alive.
   *
   * Spec ref: §12.4 — "CRL_REFRESH_HOURS" config + CRL `nextExpectedAt`.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async refreshCrl(): Promise<void> {
    try {
      const result = await this.revocationService.buildAndSign();
      await this.revocationService.markPropagated(result.version);
      this.logger.log(
        `Cron refreshCrl: built CRL v${result.version} (kid=${result.kid}, ` +
          `${result.crl.revokedLicenseIds.length} revoked licenses)`,
      );
    } catch (err) {
      this.logger.error(`Cron refreshCrl failed: ${(err as Error).message}`);
    }
  }
}
