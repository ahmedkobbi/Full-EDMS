import { SetMetadata } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

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
 *
 * Note: role strings use snake_case to match DB convention; the JWT
 * payload may use either snake_case or kebab-case — both are accepted.
 */
export const AdminRoles = (...roles: string[]) => SetMetadata(ADMIN_ROLES_KEY, roles);

/**
 * Augmented Fastify request with the decoded admin JWT payload attached
 * by AdminJwtGuard. Use `req.admin!.sub` for the admin user ID, `req.admin!.roles`
 * for the role list.
 */
export interface AuthenticatedAdminRequest extends FastifyRequest {
  admin?: {
    sub: string;
    email: string;
    roles: string[];
    type: 'access' | 'refresh' | 'step-up';
  };
  id: string;
}
