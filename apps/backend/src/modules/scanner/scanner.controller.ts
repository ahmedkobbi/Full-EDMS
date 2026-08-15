import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { Audit } from '../../common/decorators/audit.decorator';
import { ScannerService } from './scanner.service';
import type { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard';

@Controller('v1/scanner')
export class ScannerController {
  constructor(private readonly scanner: ScannerService) {}

  @Get('profiles')
  listProfiles(@Req() req: AuthenticatedRequest) {
    return this.scanner.listProfiles(req.user!.tid);
  }

  @Audit({ category: 'scanner', code: 'scanner.profile.create' })
  @Post('profiles')
  createProfile(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.scanner.createProfile(req.user!.tid, body);
  }

  @Get('jobs')
  listJobs(@Req() req: AuthenticatedRequest, @Query() q: unknown) {
    return this.scanner.listJobs(req.user!.tid, req.user!.sub, q);
  }

  @Audit({ category: 'scanner', code: 'scanner.job.create' })
  @Post('jobs')
  createJob(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.scanner.createJob(req.user!.tid, req.user!.sub, body);
  }
}
