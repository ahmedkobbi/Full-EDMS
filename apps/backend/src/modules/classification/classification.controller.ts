import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Audit } from '../../common/decorators/audit.decorator.js';
import { ClassificationService } from './classification.service.js';
import type { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard.js';

@Controller('v1/classification')
export class ClassificationController {
  constructor(private readonly classification: ClassificationService) {}

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.classification.list(req.user!.tid);
  }

  @Roles('admin', 'security-officer')
  @Audit({ category: 'classification', code: 'classification.label.create' })
  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.classification.create(req.user!.tid, body);
  }

  @Audit({ category: 'classification', code: 'classification.assign', documentIdParam: 'documentId' })
  @Post('documents/:documentId/assign')
  assign(
    @Req() req: AuthenticatedRequest,
    @Param('documentId') documentId: string,
    @Body() body: unknown,
  ) {
    return this.classification.assign(req.user!.tid, documentId, req.user!.sub, body);
  }

  @Get('documents/:documentId/history')
  history(@Req() req: AuthenticatedRequest, @Param('documentId') documentId: string) {
    return this.classification.history(req.user!.tid, documentId);
  }
}
