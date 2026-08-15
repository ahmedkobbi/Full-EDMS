import { Body, Controller, Post, Req } from '@nestjs/common';
import { Audit } from '../../common/decorators/audit.decorator';
import { StepUpAuthService } from './step-up-auth.service';
import type { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard';

@Controller('v1/auth/step-up')
export class StepUpAuthController {
  constructor(private readonly stepUp: StepUpAuthService) {}

  /**
   * Issue a step-up JWT (5min TTL) after MFA re-verification.
   * Required for destructive admin actions (spec §9.15).
   */
  @Audit({ category: 'auth', code: 'auth.step_up' })
  @Post()
  async issueStepUpToken(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.stepUp.issueStepUpToken(req.user!.tid, req.user!.sub, body);
  }
}
