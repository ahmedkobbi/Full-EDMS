/**
 * Capture rules service (spec §9.16 — barcode/QR-based capture triggers,
 * batch processing, confidence scoring, human verification queue).
 *
 * Capture rules define how scanned documents are automatically:
 *  - Split (barcode/QR code triggers document separation)
 *  - Sorted (by document type, classification, department)
 *  - Tagged (metadata extracted from barcode/QR content)
 *  - Routed (to workflow, human verification, or auto-classified)
 *
 * Spec ref: §9.16 (Barcode/QR-based capture triggers, Batch Processing,
 *           Confidence scoring, Human verification queue for low-confidence).
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { z } from 'zod';

const createCaptureRuleSchema = z.object({
  code: z.string().min(1).max(64),
  name: z.string().min(1).max(128),
  triggerType: z.enum(['barcode', 'qr_code', 'page_count', 'ocr_keyword', 'omr_pattern']),
  triggerValue: z.string().max(256), // e.g., barcode prefix, QR pattern, keyword
  actions: z.array(z.object({
    type: z.enum(['split', 'classify', 'tag', 'route_to_workflow', 'route_to_queue', 'set_metadata']),
    value: z.string().max(256),
  })).min(1).max(10),
  confidenceThreshold: z.number().min(0).max(1).default(0.8),
  isActive: z.boolean().default(true),
});

@Injectable()
export class CaptureRulesService {
  private readonly logger = new Logger(CaptureRulesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a capture rule.
   * Spec ref: §9.16 (CaptureRule entity).
   */
  async createRule(tenantId: string, raw: unknown) {
    const input = createCaptureRuleSchema.parse(raw);

    // Store as a Job payload (capture rules are configuration, not a dedicated table)
    // In a full implementation, this would have its own CaptureRule table
    const rule = {
      id: globalThis.crypto.randomUUID(),
      tenantId,
      ...input,
      createdAt: new Date().toISOString(),
    };

    // Store in Redis (capture rules are configuration, loaded on scan job start)
    await this.prisma.job.create({
      data: {
        tenantId,
        kind: 'capture_rule',
        status: 'queued',
        payload: rule as any,
      },
    });

    this.logger.log(`Capture rule created: ${rule.code} (${input.triggerType})`);
    return rule;
  }

  /**
   * List capture rules for a tenant.
   */
  async listRules(tenantId: string) {
    const jobs = await this.prisma.job.findMany({
      where: { tenantId, kind: 'capture_rule' },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return jobs.map((j) => j.payload);
  }

  /**
   * Process a scan job against capture rules.
   *
   * Applies matching rules to the scanned documents:
   *  - Split documents at barcode/QR boundaries
   *  - Auto-classify based on trigger
   *  - Tag with extracted metadata
   *  - Route to workflow or human verification queue
   *
   * Spec ref: §9.16 (Batch Processing, Confidence scoring).
   */
  async processScanJob(
    tenantId: string,
    scannerJobId: string,
    detectedTriggers: Array<{
      pageIndex: number;
      triggerType: 'barcode' | 'qr_code' | 'page_count' | 'ocr_keyword' | 'omr_pattern';
      triggerValue: string;
      confidence: number;
    }>,
  ): Promise<{
    splits: Array<{ startIndex: number; endIndex: number; documentType: string | null }>;
    classifications: Array<{ documentIndex: number; classificationCode: string; confidence: number }>;
    metadataTags: Array<{ documentIndex: number; field: string; value: string }>;
    routing: Array<{ documentIndex: number; action: string; target: string }>;
    humanVerificationRequired: Array<{ documentIndex: number; reason: string }>;
  }> {
    const rules = await this.listRules(tenantId);

    const splits: Array<{ startIndex: number; endIndex: number; documentType: string | null }> = [];
    const classifications: Array<{ documentIndex: number; classificationCode: string; confidence: number }> = [];
    const metadataTags: Array<{ documentIndex: number; field: string; value: string }> = [];
    const routing: Array<{ documentIndex: number; action: string; target: string }> = [];
    const humanVerificationRequired: Array<{ documentIndex: number; reason: string }> = [];

    // Find split points (barcode/QR triggers)
    const splitPoints: number[] = [0];
    for (const trigger of detectedTriggers) {
      if (trigger.triggerType === 'barcode' || trigger.triggerType === 'qr_code') {
        // Check if any rule matches this trigger
        const matchingRule = rules.find(
          (r: any) => r.isActive && r.triggerType === trigger.triggerType &&
          trigger.triggerValue.startsWith(r.triggerValue),
        );
        if (matchingRule && trigger.pageIndex > 0) {
          splitPoints.push(trigger.pageIndex);
        }
      }
    }

    // Create split segments
    for (let i = 0; i < splitPoints.length; i++) {
      const start = splitPoints[i];
      const end = i < splitPoints.length - 1 ? splitPoints[i + 1] - 1 : detectedTriggers.length;
      const trigger = detectedTriggers.find((t) => t.pageIndex === start);
      const matchingRule = trigger
        ? rules.find((r: any) => r.triggerType === trigger.triggerType)
        : null;

      splits.push({
        startIndex: start,
        endIndex: end,
        documentType: matchingRule?.actions?.find((a: any) => a.type === 'set_metadata' && a.value.startsWith('documentType:'))?.value.split(':')[1] ?? null,
      });
    }

    // Apply rules to each segment
    for (let docIdx = 0; docIdx < splits.length; docIdx++) {
      const split = splits[docIdx];
      const docTriggers = detectedTriggers.filter(
        (t) => t.pageIndex >= split.startIndex && t.pageIndex <= split.endIndex,
      );

      for (const trigger of docTriggers) {
        const matchingRule = rules.find(
          (r: any) => r.isActive && r.triggerType === trigger.triggerType,
        ) as any;

        if (!matchingRule) continue;

        // Check confidence
        if (trigger.confidence < matchingRule.confidenceThreshold) {
          humanVerificationRequired.push({
            documentIndex: docIdx,
            reason: `Low confidence (${trigger.confidence.toFixed(2)} < ${matchingRule.confidenceThreshold}) for trigger ${trigger.triggerType}`,
          });
          continue;
        }

        // Apply actions
        for (const action of matchingRule.actions) {
          switch (action.type) {
            case 'classify':
              classifications.push({
                documentIndex: docIdx,
                classificationCode: action.value,
                confidence: trigger.confidence,
              });
              break;
            case 'tag':
              metadataTags.push({
                documentIndex: docIdx,
                field: action.value.split(':')[0] ?? 'tag',
                value: action.value.split(':')[1] ?? action.value,
              });
              break;
            case 'route_to_workflow':
              routing.push({
                documentIndex: docIdx,
                action: 'workflow',
                target: action.value,
              });
              break;
            case 'route_to_queue':
              routing.push({
                documentIndex: docIdx,
                action: 'queue',
                target: action.value,
              });
              break;
          }
        }
      }
    }

    this.logger.log(`Scan job ${scannerJobId} processed: ${splits.length} documents, ${humanVerificationRequired.length} need verification`);
    return { splits, classifications, metadataTags, routing, humanVerificationRequired };
  }
}
