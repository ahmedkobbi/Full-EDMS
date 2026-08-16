import { Controller, Get, NotFoundException, Param, Post, Query, Req, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { Roles } from '../../common/decorators/roles.decorator';
import { Audit } from '../../common/decorators/audit.decorator';
import { AuditApiService } from './audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/storage.service';
import type { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard';

@Controller('v1/audit')
export class AuditController {
  constructor(
    private readonly audit: AuditApiService,
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  @Roles('admin', 'auditor', 'security-officer')
  @Get('events')
  query(@Req() req: AuthenticatedRequest, @Query() q: unknown) {
    return this.audit.query(req.user!.tid, q);
  }

  @Roles('admin', 'auditor')
  @Get('verify-chain')
  verifyChain(@Req() req: AuthenticatedRequest) {
    return this.audit.verifyChain(req.user!.tid);
  }

  @Roles('admin', 'auditor')
  @Audit({ category: 'audit', code: 'audit.export.request' })
  @Post('export')
  export(@Req() req: AuthenticatedRequest, @Query() q: unknown) {
    return this.audit.requestExport(req.user!.tid, req.user!.sub, q);
  }

  /**
   * Check the status of an audit export job (spec §9.12).
   */
  @Roles('admin', 'auditor')
  @Get('export/:jobId/status')
  async getExportStatus(@Req() req: AuthenticatedRequest, @Param('jobId') jobId: string) {
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, tenantId: req.user!.tid, kind: 'audit_export' },
    });
    if (!job) {throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });}
    return {
      jobId: job.id,
      status: job.status,
      result: job.result,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    };
  }

  /**
   * Download a completed audit export (spec §9.12).
   * Streams the file from object storage.
   */
  @Roles('admin', 'auditor')
  @Audit({ category: 'audit', code: 'audit.export.download', resourceType: 'job', resourceIdParam: 'jobId' })
  @Get('export/:jobId/download')
  async downloadExport(
    @Req() req: AuthenticatedRequest,
    @Param('jobId') jobId: string,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, tenantId: req.user!.tid, kind: 'audit_export', status: 'completed' },
    });
    if (!job || !job.result || typeof (job.result as { storageKey?: string }).storageKey !== 'string') {
      throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });
    }

    const storageKey = (job.result as { storageKey?: string }).storageKey as string;
    const signedUrl = await this.storage.signDownloadUrl(storageKey, 300); // 5min

    // Redirect to the signed URL
    reply.header('Location', signedUrl);
    reply.code(302);
    return { downloadUrl: signedUrl, expiresIn: 300 };
  }
}
