import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { Audit } from '../../common/decorators/audit.decorator';
import { CaptureRulesService } from './capture-rules.service';
import type { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard';

@Controller('v1/capture-rules')
export class CaptureRulesController {
  constructor(private readonly rules: CaptureRulesService) {}

  @Roles('admin', 'records-manager')
  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.rules.listRules(req.user!.tid);
  }

  @Roles('admin', 'records-manager')
  @Audit({ category: 'scanner', code: 'scanner.capture_rule.create' })
  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.rules.createRule(req.user!.tid, body);
  }

  @Roles('admin', 'records-manager')
  @Post('process/:scannerJobId')
  async process(
    @Req() req: AuthenticatedRequest,
    @Body() body: { detectedTriggers: Array<{ pageIndex: number; triggerType: string; triggerValue: string; confidence: number }> },
  ) {
    return this.rules.processScanJob(req.user!.tid, body.detectedTriggers[0]?.pageIndex?.toString() ?? 'unknown', body.detectedTriggers);
  }
}
