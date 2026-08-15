import { SetMetadata } from '@nestjs/common';

export const ADMIN_ROLES_KEY = 'smart-edms:license-server:adminRoles';

/**
 * Restrict a route to specific admin roles. The {@link AdminJwtGuard}
 * (or a separate RolesGuard) reads this metadata.
 *
 * Roles (most to least privileged):
 *   - `'super_admin'` — full control, including key rotation
 *   - `'admin'` — manage customers, licenses, plans, webhooks
 *   - `'support'` — read access + license re-issue, no revocation
 *   - `'read_only'` — read-only access for support dashboards
 */
export const AdminRoles = (...roles: string[]) => SetMetadata(ADMIN_ROLES_KEY, roles);
