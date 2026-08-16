/**
 * AI Workflow Generation + Agentic Document Negotiators (spec §9.8).
 *
 * Two AI-assisted features:
 *
 * 1. AI Workflow Generation: AI assists in drafting BPMN/CMMN/DMN models
 *    based on natural language descriptions, subject to human review.
 *
 * 2. Agentic Document Negotiators: If an uploaded contract contradicts a
 *    tenant's DMN policy, the AI drafts a redlined addendum, generates a
 *    risk memo, and routes a pre-filled approval workflow — requiring only
 *    human sign-off.
 *
 * Spec ref: §9.8 (AI Workflow Generation, Agentic Document Negotiators).
 *
 * CRITICAL: All AI-generated content is marked as drafts and requires
 * human review before activation (spec §9.14 — "human approval for high-risk
 * decisions", §9.8 — "AI must not auto-execute high-risk workflow actions").
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../common/audit.service';
import { z } from 'zod';

const generateWorkflowSchema = z.object({
  description: z.string().min(10).max(2000),
  modelKind: z.enum(['BPMN', 'CMMN', 'DMN']).default('BPMN'),
  documentType: z.string().max(64).optional(),
});

const negotiateContractSchema = z.object({
  documentId: z.string().uuid(),
  dmnPolicyId: z.string().uuid().optional(),
});

@Injectable()
export class AiWorkflowService {
  private readonly logger = new Logger(AiWorkflowService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Generate a workflow definition draft from a natural language description.
   *
   * The AI parses the description and produces a BPMN/CMMN/DMN model
   * as a draft. The draft is saved with isAiDraft=true and CANNOT be
   * published without humanReviewed=true.
   *
   * Spec ref: §9.8 (AI Workflow Generation).
   */
  async generateWorkflowDraft(
    tenantId: string,
    userId: string,
    raw: unknown,
  ): Promise<{
    definitionId: string;
    isAiDraft: true;
    modelKind: string;
    name: string;
    description: string;
    steps: Array<{
      stepOrder: number;
      titleKey: string;
      assigneeKind: 'user' | 'role' | 'system';
      assigneeValue: string | null;
      dueInHours: number | null;
      parallel: boolean;
    }>;
    humanReviewRequired: true;
  }> {
    const input = generateWorkflowSchema.parse(raw);

    // Parse the description to extract workflow steps
    // In a real implementation, this would call an LLM with a structured prompt
    // For now, use heuristic parsing based on keywords
    const steps = this.parseDescriptionToSteps(input.description);

    // Generate a workflow name from the description
    const name = input.description.slice(0, 60).trim() + (input.description.length > 60 ? '…' : '');

    // Create the workflow definition as a DRAFT with isAiDraft=true
    const definition = await this.prisma.workflowDefinition.create({
      data: {
        tenantId,
        code: `ai-draft-${Date.now().toString(36)}`,
        name,
        description: input.description,
        modelKind: input.modelKind,
        definitionJson: {
          steps,
          generatedBy: 'ai',
          generatedAt: new Date().toISOString(),
          sourceDescription: input.description,
        } as any,
        version: 1,
        status: 'DRAFT',
        isAiDraft: true,
        createdByUserId: userId,
      },
    });

    void this.audit.record({
      tenantId,
      userId,
      category: 'workflow',
      code: 'workflow.ai.generate',
      result: 'allow',
      resourceType: 'workflow_definition',
      resourceId: definition.id,
      metadata: {
        modelKind: input.modelKind,
        stepCount: steps.length,
        isAiDraft: true,
      },
    });

    this.logger.log(`AI workflow draft generated: ${definition.id} (${steps.length} steps, ${input.modelKind})`);

    return {
      definitionId: definition.id,
      isAiDraft: true,
      modelKind: input.modelKind,
      name,
      description: input.description,
      steps,
      humanReviewRequired: true,
    };
  }

  /**
   * Agentic Document Negotiator: analyze a contract against DMN policy,
   * draft a redlined addendum + risk memo, and route a pre-filled approval
   * workflow.
   *
   * Spec ref: §9.8 (Agentic Document Negotiators).
   *
   * The AI does NOT execute anything — it only produces drafts that require
   * human sign-off via a pre-filled approval workflow.
   */
  async negotiateContract(
    tenantId: string,
    userId: string,
    raw: unknown,
  ): Promise<{
    documentId: string;
    riskMemo: string;
    contradictions: Array<{
      clause: string;
      policy: string;
      severity: 'low' | 'medium' | 'high';
      suggestedRedline: string;
    }>;
    proposedWorkflowId: string | null;
    humanSignOffRequired: true;
  }> {
    const input = negotiateContractSchema.parse(raw);

    const doc = await this.prisma.document.findFirst({
      where: { id: input.documentId, tenantId },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
    });
    if (!doc) {throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });}

    // In a real implementation, this would:
    // 1. Extract text from the contract (OCR if scanned)
    // 2. Parse clauses using NLP
    // 3. Compare against the tenant's DMN policy rules
    // 4. Generate redlines for contradicting clauses
    // 5. Draft a risk memo summarizing findings
    // 6. Create a pre-filled approval workflow

    // For now, produce a structured result with placeholders
    const contradictions: Array<{
      clause: string;
      policy: string;
      severity: 'low' | 'medium' | 'high';
      suggestedRedline: string;
    }> = [];

    // Heuristic: check document title for risk keywords
    const titleLower = doc.title.toLowerCase();
    if (titleLower.includes('liability') || titleLower.includes('indemnif')) {
      contradictions.push({
        clause: 'Liability / Indemnification clause',
        policy: 'DMN-RULE-LIABILITY-CAP',
        severity: 'high',
        suggestedRedline: 'Cap liability at 12 months of fees, exclude indirect damages',
      });
    }
    if (titleLower.includes('termination') || titleLower.includes('notice')) {
      contradictions.push({
        clause: 'Termination notice period',
        policy: 'DMN-RULE-TERMINATION-30D',
        severity: 'medium',
        suggestedRedline: 'Require 30-day written notice for termination',
      });
    }
    if (titleLower.includes('payment') || titleLower.includes('invoice')) {
      contradictions.push({
        clause: 'Payment terms',
        policy: 'DMN-RULE-PAYMENT-NET30',
        severity: 'low',
        suggestedRedline: 'Net 30 payment terms, no early payment discount required',
      });
    }

    const riskMemo = this.generateRiskMemo(doc.title, contradictions);

    // Create a pre-filled approval workflow for the negotiated addendum
    let proposedWorkflowId: string | null = null;
    if (contradictions.length > 0) {
      const workflow = await this.prisma.workflowDefinition.create({
        data: {
          tenantId,
          code: `negotiation-${doc.id.slice(0, 8)}`,
          name: `Contract review: ${doc.title.slice(0, 40)}`,
          description: `AI-generated negotiation workflow for document ${doc.id}`,
          modelKind: 'BPMN',
          definitionJson: {
            steps: [
              { stepOrder: 1, titleKey: 'Legal review', assigneeKind: 'role', assigneeValue: 'legal', dueInHours: 48, parallel: false },
              { stepOrder: 2, titleKey: 'Risk assessment', assigneeKind: 'role', assigneeValue: 'security-officer', dueInHours: 24, parallel: false },
              { stepOrder: 3, titleKey: 'Final approval', assigneeKind: 'role', assigneeValue: 'admin', dueInHours: 48, parallel: false },
            ],
            generatedBy: 'ai-negotiator',
            contradictions,
          } as any,
          version: 1,
          status: 'DRAFT',
          isAiDraft: true,
          createdByUserId: userId,
        },
      });
      proposedWorkflowId = workflow.id;
    }

    void this.audit.record({
      tenantId,
      userId,
      category: 'workflow',
      code: 'workflow.ai.negotiate',
      result: 'allow',
      resourceType: 'document',
      resourceId: input.documentId,
      documentId: input.documentId,
      metadata: {
        contradictionCount: contradictions.length,
        proposedWorkflowId,
        isAiDraft: true,
      },
    });

    this.logger.log(`Contract negotiation: doc=${input.documentId} contradictions=${contradictions.length} workflow=${proposedWorkflowId ?? 'none'}`);

    return {
      documentId: input.documentId,
      riskMemo,
      contradictions,
      proposedWorkflowId,
      humanSignOffRequired: true,
    };
  }

  /**
   * Parse a natural language description into workflow steps.
   * Heuristic implementation — production would use an LLM.
   */
  private parseDescriptionToSteps(description: string): Array<{
    stepOrder: number;
    titleKey: string;
    assigneeKind: 'user' | 'role' | 'system';
    assigneeValue: string | null;
    dueInHours: number | null;
    parallel: boolean;
  }> {
    const steps: Array<{
      stepOrder: number;
      titleKey: string;
      assigneeKind: 'user' | 'role' | 'system';
      assigneeValue: string | null;
      dueInHours: number | null;
      parallel: boolean;
    }> = [];

    // Split by common step delimiters
    const sentences = description.split(/[.;\n]/).filter((s) => s.trim().length > 5);

    for (let i = 0; i < sentences.length && i < 10; i++) {
      const sentence = sentences[i].trim();
      const lower = sentence.toLowerCase();

      // Detect assignee
      let assigneeKind: 'user' | 'role' | 'system' = 'role';
      let assigneeValue: string | null = null;

      if (lower.includes('admin') || lower.includes('administrator')) {
        assigneeValue = 'admin';
      } else if (lower.includes('manager') || lower.includes('approver')) {
        assigneeValue = 'manager';
      } else if (lower.includes('legal')) {
        assigneeValue = 'legal';
      } else if (lower.includes('security')) {
        assigneeValue = 'security-officer';
      } else if (lower.includes('automatic') || lower.includes('system') || lower.includes('auto')) {
        assigneeKind = 'system';
        assigneeValue = null;
      } else {
        assigneeValue = 'end-user';
      }

      // Detect due time
      let dueInHours: number | null = null;
      const hoursMatch = lower.match(/(\d+)\s*(hour|hr)/);
      const daysMatch = lower.match(/(\d+)\s*(day|week)/);
      if (hoursMatch) {dueInHours = parseInt(hoursMatch[1], 10);}
      else if (daysMatch) {
        const n = parseInt(daysMatch[1], 10);
        dueInHours = lower.includes('week') ? n * 24 * 7 : n * 24;
      }

      steps.push({
        stepOrder: i + 1,
        titleKey: `workflow.ai.step${i + 1}`,
        assigneeKind,
        assigneeValue,
        dueInHours,
        parallel: false,
      });
    }

    // Ensure at least one step
    if (steps.length === 0) {
      steps.push({
        stepOrder: 1,
        titleKey: 'workflow.ai.defaultStep',
        assigneeKind: 'role',
        assigneeValue: 'admin',
        dueInHours: 48,
        parallel: false,
      });
    }

    return steps;
  }

  /**
   * Generate a risk memo from the contradictions.
   */
  private generateRiskMemo(docTitle: string, contradictions: Array<{ clause: string; severity: string }>): string {
    const highCount = contradictions.filter((c) => c.severity === 'high').length;
    const medCount = contradictions.filter((c) => c.severity === 'medium').length;
    const lowCount = contradictions.filter((c) => c.severity === 'low').length;

    return [
      `RISK MEMO — Contract Analysis: ${docTitle}`,
      `Generated: ${new Date().toISOString()}`,
      ``,
      `Summary: ${contradictions.length} contradiction(s) detected against tenant DMN policy.`,
      `  - High severity: ${highCount}`,
      `  - Medium severity: ${medCount}`,
      `  - Low severity: ${lowCount}`,
      ``,
      `Recommendation: ${highCount > 0 ? 'DO NOT EXECUTE without legal review of high-severity items.' : 'Review recommended before execution.'}`,
      ``,
      `Contradicting clauses:`,
      ...contradictions.map((c, i) => `  ${i + 1}. [${c.severity.toUpperCase()}] ${c.clause}`),
      ``,
      `This memo was generated by AI and requires human sign-off before any action is taken.`,
    ].join('\n');
  }
}
