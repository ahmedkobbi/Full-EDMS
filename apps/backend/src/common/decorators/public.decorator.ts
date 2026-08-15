import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'smart-edms:public';

/**
 * Mark a route as public (no JWT auth, no tenant guard, no license guard).
 * Use sparingly — only for health checks, login, MFA enroll, and marketing endpoints.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
