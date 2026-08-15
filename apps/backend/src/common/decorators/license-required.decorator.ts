import { SetMetadata } from '@nestjs/common';
import type { EntitlementModule } from '@smart-edms/types';

export const LICENSE_REQUIRED_KEY = 'smart-edms:license-required';

export interface LicenseRequirement {
  module: EntitlementModule;
  /**
   * If true, the route is rejected with AI_NOT_LICENSED when the module is not entitled.
   * If false, the route still runs but downstream services should degrade gracefully.
   */
  failClosed?: boolean;
}

/**
 * Mark a route as requiring a specific licensed module.
 *
 * Example:
 *   @LicenseRequired({ module: 'ai-assistant' })
 *   @Post('ai/assistant/chat')
 */
export const LicenseRequired = (req: LicenseRequirement) => SetMetadata(LICENSE_REQUIRED_KEY, req);
