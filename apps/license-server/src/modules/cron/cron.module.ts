import { Module } from '@nestjs/common';
import { CronService } from './cron.service.js';
import { LicenseModule } from '../license/license.module.js';
import { TrialModule } from '../trial/trial.module.js';
import { HeartbeatModule } from '../heartbeat/heartbeat.module.js';
import { RevocationModule } from '../revocation/revocation.module.js';

/**
 * Scheduled jobs module — registers the CronService which runs
 * periodic tasks (license expiry, trial expiry, stale deployment
 * flagging, CRL refresh).
 *
 * Spec ref: §12.4 (CRL refresh), §12.9 (heartbeat failures),
 * §12.10 (trials auto-expire).
 */
@Module({
  imports: [LicenseModule, TrialModule, HeartbeatModule, RevocationModule],
  providers: [CronService],
})
export class CronModule {}
