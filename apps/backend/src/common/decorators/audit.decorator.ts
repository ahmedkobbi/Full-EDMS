import { SetMetadata } from '@nestjs/common';
import type { AuditCategory, AuditEventCode } from '@smart-edms/types';

export const AUDIT_KEY = 'smart-edms:audit';

export interface AuditMetadata {
  category: AuditCategory;
  code: AuditEventCode;
  resourceType?: string;
  resourceIdParam?: string;
  documentIdParam?: string;
  tenantIdFallback?: string;
}

/**
 * Decorate a controller method to emit an audit event on every call.
 * The AuditInterceptor picks this up and records success/deny outcomes.
 *
 * Example:
 *   @Audit({ category: 'document', code: 'document.download', resourceType: 'document', resourceIdParam: 'id' })
 *   @Get(':id/download')
 *   async download(@Param('id') id: string) { ... }
 */
export const Audit = (meta: AuditMetadata) => SetMetadata(AUDIT_KEY, meta);
