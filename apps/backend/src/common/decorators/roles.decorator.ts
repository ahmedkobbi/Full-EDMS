import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'smart-edms:roles';

/**
 * Restrict a route to specific role codes. Tenant guard enforces this.
 *
 * Example:
 *   @Roles('admin', 'records-manager')
 *   @Get('audit/logs')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
