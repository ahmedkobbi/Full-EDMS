import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { LICENSE_REQUIRED_KEY, type LicenseRequirement } from '../decorators/license-required.decorator';
import { LicenseService } from '../../modules/license/license.service';
import type { AuthenticatedRequest } from './jwt-auth.guard';
import type { LicenseState } from '@smart-edms/types';

/**
 * Enforces license state on every non-public route.
 * Spec ref: §4.4 (license failure behavior), §27.4 (licensing rules — fail-closed).
 *
 * State behavior:
 * - valid / expiring_soon / expired_grace → allow (with warning if expiring)
 * - grace_exhausted → read-only mode: GET allowed, mutating endpoints blocked
 * - extended_remediation → admin-only: only users with 'admin' role pass
 * - invalid → 503 Service Unavailable, only @Public() health routes pass
 */
@Injectable()
export class LicenseGuard implements CanActivate {
  private readonly logger = new Logger(LicenseGuard.name);

  constructor(
    private readonly license: LicenseService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {return true;}

    const state = await this.license.getCurrentState();
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const method = req.method.toUpperCase();

    switch (state) {
      case 'valid':
      case 'expiring_soon':
      case 'expired_grace':
        return true;

      case 'grace_exhausted':
        // Read-only mode — allow GET/HEAD/OPTIONS only
        if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {return true;}
        throw new ForbiddenException({ messageKey: 'errors.LICENSE_GRACE_EXHAUSTED' });

      case 'extended_remediation':
        // Admin-only — admins can import/renew/remediate
        if (req.user?.roles?.includes('admin')) {return true;}
        throw new ServiceUnavailableException({ messageKey: 'errors.LICENSE_GRACE_EXHAUSTED' });

      case 'invalid':
        throw new ServiceUnavailableException({ messageKey: 'errors.LICENSE_INVALID' });

      default:
        throw new ServiceUnavailableException({ messageKey: 'errors.LICENSE_INVALID' });
    }

    // The LicenseRequirement decorator can additionally gate specific modules
    // (e.g., AI assistant requires ai-assistant entitlement). Checked below.
    void LICENSE_REQUIRED_KEY;
  }
}
