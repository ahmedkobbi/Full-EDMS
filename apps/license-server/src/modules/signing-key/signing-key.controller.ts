import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SigningKeyService } from './signing-key.service.js';
import { AdminJwtGuard, type AdminAuthenticatedRequest } from '../../security/admin-jwt.guard.js';
import { StepUpGuard } from '../../security/step-up.guard.js';
import { AuditAction } from '../../common/decorators/audit-action.decorator.js';
import type { SigningAlg } from '@smart-edms/license-core';

/**
 * Signing-key admin endpoints.
 *
 * Spec ref: §12.4 (signing keys), §27.3 (security rules).
 *
 * All endpoints require admin JWT. Key rotation additionally requires
 * step-up auth (MFA verified within the last 5 minutes).
 *
 * The PRIVATE key is NEVER exposed via these endpoints — only public
 * metadata (kid, alg, public key PEM, status).
 */
@ApiTags('signing-keys')
@Controller('v1/signing-keys')
@UseGuards(AdminJwtGuard)
export class SigningKeyController {
  constructor(private readonly signingKey: SigningKeyService) {}

  /**
   * Returns the active signing key's PUBLIC metadata. Used by the admin
   * panel to display the current signer.
   */
  @Get('active')
  @ApiOperation({ summary: 'Get the active signing key (public metadata only)' })
  async getActive() {
    const pub = this.signingKey.getActivePublicKey();
    if (!pub) {
      return { loaded: false as const };
    }
    return { loaded: true as const, ...pub };
  }

  /**
   * List all signing keys (active, retiring, retired). For the admin
   * panel's key management view.
   */
  @Get()
  @ApiOperation({ summary: 'List all signing keys (public metadata only)' })
  async list() {
    return { keys: await this.signingKey.listKeys() };
  }

  /**
   * Generate a new signing keypair for rotation.
   *
   * The PRIVATE half is written to `targetKeyPath` (chmod 600) and the
   * PUBLIC half is returned. The current key is marked as `'retiring'`;
   * on the next server restart the new key becomes active.
   *
   * Requires step-up auth.
   */
  @Post('rotate')
  @UseGuards(StepUpGuard)
  @AuditAction('signing-key.rotate')
  @ApiOperation({ summary: 'Generate a new signing keypair for rotation (step-up auth required)' })
  async rotate(
    @Body() body: { targetKeyPath: string; alg?: SigningAlg },
    @Query('alg') algQuery: SigningAlg | undefined,
    @Req() req: AdminAuthenticatedRequest,
  ) {
    const targetKeyPath = body?.targetKeyPath;
    if (!targetKeyPath || typeof targetKeyPath !== 'string') {
      throw new Error('targetKeyPath is required');
    }
    return this.signingKey.generateRotationKey({
      targetKeyPath,
      alg: body?.alg ?? algQuery,
      createdByAdminId: req.admin!.sub,
    });
  }
}
