import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AdminJwtGuard } from '../../security/admin-jwt.guard.js';
import { UsageService } from './usage.service.js';

@Controller('v1/usage')
@UseGuards(AdminJwtGuard)
export class UsageController {
  constructor(private readonly usage: UsageService) {}

  @Get('aggregate')
  getAggregate() {
    return this.usage.getAggregate();
  }

  @Get('license/:licenseId/latest')
  getLatest(@Param('licenseId') licenseId: string) {
    return this.usage.getLatest(licenseId);
  }

  @Get('license/:licenseId/history')
  getHistory(
    @Param('licenseId') licenseId: string,
    @Query('metric') metric: string,
    @Query('limit') limit?: string,
  ) {
    return this.usage.getHistory(licenseId, metric, limit ? parseInt(limit, 10) : 100);
  }
}
