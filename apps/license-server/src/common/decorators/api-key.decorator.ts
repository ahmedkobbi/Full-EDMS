import { SetMetadata } from '@nestjs/common';

export const IS_API_KEY_OPTIONAL_KEY = 'smart-edms:license-server:apiKeyOptional';

/**
 * Mark a route as accepting EITHER an API key (X-Api-Key header) OR an
 * activation code (in the request body). Used for online activation and
 * heartbeat endpoints (spec §12.7, §12.9).
 *
 * When applied, the {@link ApiKeyGuard} will:
 *   1. Check for `X-Api-Key` header. If present, validate it.
 *   2. If absent, fall back to validating the activation code in the body.
 *   3. If neither is present, reject with 401.
 */
export const OptionalApiKey = () => SetMetadata(IS_API_KEY_OPTIONAL_KEY, true);

export const API_KEY_SCOPES_KEY = 'smart-edms:license-server:apiKeyScopes';

/**
 * Required API key scopes for a route. The {@link ApiKeyGuard} checks
 * that the presented API key carries at least one of the listed scopes.
 */
export const RequireScopes = (...scopes: string[]) => SetMetadata(API_KEY_SCOPES_KEY, scopes);
