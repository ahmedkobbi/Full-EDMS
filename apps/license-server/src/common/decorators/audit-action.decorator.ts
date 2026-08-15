import { SetMetadata } from '@nestjs/common';

export const AUDIT_ACTION_KEY = 'smart-edms:license-server:auditAction';

/**
 * Mark a controller method for audit logging. The {@link AuditInterceptor}
 * reads this metadata and records an entry in the licensing server's
 * hash-chained audit log (spec §12.1, §21.7).
 *
 * @param action — dot-separated action code, e.g. `'customer.create'`,
 *   `'license.issue'`, `'license.revoke'`, `'signing-key.rotate'`.
 */
export const AuditAction = (action: string) => SetMetadata(AUDIT_ACTION_KEY, action);
