import { Body, Controller, Post, Req } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Audit } from '../../common/decorators/audit.decorator.js';
import { CryptoShreddingService } from './crypto-shredding.service.js';
import type { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard.js';

@Controller('v1/crypto-shred')
export class CryptoShreddingController {
  constructor(private readonly shredding: CryptoShreddingService) {}

  /**
   * Crypto-shred a document (IRREVERSIBLE — destroys DEKs).
   * Requires admin role + explicit approval flag + reason.
   * Blocked if document is under legal hold.
   *
   * Spec ref: §9.7 (Automated Crypto-Shredding for privacy deletion where approved).
   */
  @Roles('admin')
  @Audit({ category: 'retention', code: 'retention.crypto_shred' })
  @Post()
  async shred(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.shredding.shredDocument(req.user!.tid, req.user!.sub, body);
  }
}
