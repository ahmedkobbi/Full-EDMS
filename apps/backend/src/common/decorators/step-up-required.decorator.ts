import { SetMetadata } from '@nestjs/common';

export const STEP_UP_REQUIRED_KEY = 'smart-edms:step-up-required';

/**
 * Mark a route as requiring step-up authentication (MFA re-verification
 * within the last 5 minutes).
 *
 * Spec ref: §9.15 (high-risk actions require step-up authentication).
 *
 * Example:
 *   @StepUpRequired()
 *   @Delete('users/:id')
 *   async deleteUser() { ... }
 */
export const StepUpRequired = () => SetMetadata(STEP_UP_REQUIRED_KEY, true);
