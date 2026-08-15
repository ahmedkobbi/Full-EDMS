import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'smart-edms:license-server:public';

/**
 * Mark a route as public — no JWT auth, no API key auth, no step-up.
 * Use sparingly: health checks, the CRL fetch endpoint, the offline
 * activation request intake (when no API key is provided).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
