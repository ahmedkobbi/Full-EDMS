/**
 * Multimodal evidence syncing service (spec §9.10).
 *
 * Ingests video or audio alongside text. AI transcribes the media, syncs
 * it to text via timestamps, and allows searching for a spoken phrase in
 * a video to jump to the corresponding document page.
 *
 * Spec ref: §9.10 (Multimodal Evidence Syncing where enabled).
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis.service';
import { AuditService } from '../../common/audit.service';
import { z } from 'zod';

const transcribeSchema = z.object({
  documentId: z.string().uuid(),
  versionId: z.string().uuid(),
  mediaType: z.enum(['video', 'audio']),
  language: z.string().max(16).default('en'),
});

export interface TranscriptionSegment {
  startTime: number; // seconds
  endTime: number;
  text: string;
  confidence: number;
  speakerId?: string;
}

export interface TranscriptionResult {
  documentId: string;
  versionId: string;
  segments: TranscriptionSegment[];
  totalDuration: number;
  language: string;
  transcriptText: string; // full concatenated text
  syncedToDocumentPages: Array<{
    timestamp: number;
    documentPage: number;
  }>;
}

@Injectable()
export class MultimodalService {
  private readonly logger = new Logger(MultimodalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Transcribe a media file (video or audio) associated with a document.
   *
   * In production, this would call a speech-to-text API (Whisper, Google
   * Speech-to-Text, AWS Transcribe). The transcription is stored as
   * timestamped segments synced to the document's pages.
   *
   * Spec ref: §9.10 (Multimodal Evidence Syncing — AI transcribes media,
   *           syncs it to text via timestamps, allows searching for a spoken
   *           phrase to jump to the corresponding document page).
   */
  async transcribeMedia(
    tenantId: string,
    userId: string,
    raw: unknown,
  ): Promise<{ jobId: string; status: string }> {
    const input = transcribeSchema.parse(raw);

    // Create a job for async processing
    const job = await this.prisma.job.create({
      data: {
        tenantId,
        kind: 'multimodal_transcription',
        status: 'queued',
        payload: {
          documentId: input.documentId,
          versionId: input.versionId,
          mediaType: input.mediaType,
          language: input.language,
          requestedBy: userId,
        } as any,
      },
    });

    // Publish to worker
    await this.redis.connection.publish(
      'smart-edms:internal:multimodal-transcribe',
      JSON.stringify({ jobId: job.id, tenantId }),
    );

    void this.audit.record({
      tenantId,
      userId,
      category: 'document',
      code: 'document.multimodal.transcribe',
      result: 'allow',
      resourceType: 'document',
      resourceId: input.documentId,
      documentId: input.documentId,
      metadata: { versionId: input.versionId, mediaType: input.mediaType, language: input.language },
    });

    return { jobId: job.id, status: 'queued' };
  }

  /**
   * Get transcription result (called by the worker after transcription completes).
   */
  async getTranscription(tenantId: string, documentId: string): Promise<TranscriptionResult | null> {
    const data = await this.redis.getJson<TranscriptionResult>(`multimodal:transcription:${documentId}`);
    return data;
  }

  /**
   * Store the transcription result (called by the worker).
   */
  async storeTranscription(documentId: string, result: TranscriptionResult): Promise<void> {
    await this.redis.setJson(`multimodal:transcription:${documentId}`, result, 86400 * 30); // 30 days
  }

  /**
   * Search for a spoken phrase in the transcription and return timestamps.
   * The client can use these timestamps to jump to the corresponding video
   * position + document page.
   *
   * Spec ref: §9.10 (allows searching for a spoken phrase in a video to jump
   *           to the corresponding document page).
   */
  async searchSpokenPhrase(
    tenantId: string,
    documentId: string,
    phrase: string,
  ): Promise<Array<{
    timestamp: number;
    endTime: number;
    matchedText: string;
    documentPage: number | null;
    confidence: number;
  }>> {
    const transcription = await this.getTranscription(tenantId, documentId);
    if (!transcription) return [];

    const phraseLower = phrase.toLowerCase();
    const matches: Array<{
      timestamp: number;
      endTime: number;
      matchedText: string;
      documentPage: number | null;
      confidence: number;
    }> = [];

    for (const segment of transcription.segments) {
      if (segment.text.toLowerCase().includes(phraseLower)) {
        // Find the corresponding document page
        const pageSync = transcription.syncedToDocumentPages.find(
          (p) => p.timestamp <= segment.startTime,
        );
        matches.push({
          timestamp: segment.startTime,
          endTime: segment.endTime,
          matchedText: segment.text,
          documentPage: pageSync?.documentPage ?? null,
          confidence: segment.confidence,
        });
      }
    }

    return matches;
  }

  /**
   * Get transcription job status.
   */
  async getTranscriptionStatus(tenantId: string, jobId: string) {
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, tenantId, kind: 'multimodal_transcription' },
    });
    if (!job) throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });
    return {
      jobId: job.id,
      status: job.status,
      result: job.result,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    };
  }
}
