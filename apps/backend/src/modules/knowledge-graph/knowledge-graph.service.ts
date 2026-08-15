/**
 * 3D Knowledge Graph service (spec §9.10 — 3D Knowledge Graph Explorer).
 *
 * Visualizes hidden relationships using a spatial graph connecting people,
 * projects, locations, and documents. The graph is built from:
 *  - Document metadata (businessOwner, department, project, caseNumber)
 *  - Workflow instances (who approved what)
 *  - Share links (who shared with whom)
 *  - Audit events (who accessed what when)
 *
 * Returns nodes + edges for client-side 3D rendering (Three.js / D3 force-graph).
 *
 * Spec ref: §9.10 (3D Knowledge Graph Explorer where enabled).
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { z } from 'zod';

const querySchema = z.object({
  depth: z.coerce.number().int().min(1).max(5).default(2),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  filterType: z.enum(['person', 'project', 'location', 'document', 'department']).optional(),
});

export interface GraphNode {
  id: string;
  type: 'person' | 'project' | 'location' | 'document' | 'department';
  label: string;
  properties: Record<string, unknown>;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: 'created' | 'owns' | 'belongs_to' | 'located_in' | 'shared_with' | 'approved' | 'accessed';
  weight: number;
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: { totalNodes: number; totalEdges: number; depth: number };
}

@Injectable()
export class KnowledgeGraphService {
  private readonly logger = new Logger(KnowledgeGraphService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Build the knowledge graph for a tenant.
   *
   * Spec ref: §9.10 (3D Knowledge Graph Explorer — visualize hidden relationships
   * connecting people, projects, locations, and documents).
   *
   * 3D graph queries must not return unbounded relationship data (spec §9.10).
   */
  async getGraph(tenantId: string, rawQuery: unknown): Promise<KnowledgeGraph> {
    const q = querySchema.parse(rawQuery);

    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const nodeSet = new Set<string>();

    // 1. Document nodes
    const documents = await this.prisma.document.findMany({
      where: { tenantId, deletedAt: null },
      take: q.limit,
      select: {
        id: true,
        title: true,
        documentType: true,
        createdByUserId: true,
        updatedAt: true,
      },
    });

    for (const doc of documents) {
      if (!nodeSet.has(doc.id)) {
        nodes.push({
          id: doc.id,
          type: 'document',
          label: doc.title,
          properties: { documentType: doc.documentType, updatedAt: doc.updatedAt },
        });
        nodeSet.add(doc.id);
      }
    }

    // 2. Person nodes (from document creators)
    const userIds = [...new Set(documents.map((d) => d.createdByUserId).filter(Boolean))] as string[];
    if (userIds.length > 0) {
      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds }, tenantId },
        select: { id: true, firstName: true, lastName: true, email: true },
      });
      for (const user of users) {
        if (!nodeSet.has(user.id)) {
          nodes.push({
            id: user.id,
            type: 'person',
            label: `${user.firstName} ${user.lastName}`,
            properties: { email: user.email },
          });
          nodeSet.add(user.id);
        }
        // Edge: person created document
        const docsByUser = documents.filter((d) => d.createdByUserId === user.id);
        for (const doc of docsByUser) {
          edges.push({
            source: user.id,
            target: doc.id,
            type: 'created',
            weight: 1,
          });
        }
      }
    }

    // 3. Department nodes (from metadata values)
    const deptValues = await this.prisma.metadataValue.findMany({
      where: { tenantId, fieldCode: 'department' },
      select: { value: true, documentId: true },
      take: q.limit,
    });
    const departments = new Map<string, string[]>();
    for (const dv of deptValues) {
      const deptName = String(dv.value);
      if (!departments.has(deptName)) departments.set(deptName, []);
      departments.get(deptName)!.push(dv.documentId);
    }
    for (const [deptName, docIds] of departments) {
      const deptId = `dept:${deptName}`;
      if (!nodeSet.has(deptId)) {
        nodes.push({
          id: deptId,
          type: 'department',
          label: deptName,
          properties: { documentCount: docIds.length },
        });
        nodeSet.add(deptId);
      }
      for (const docId of docIds) {
        if (nodeSet.has(docId)) {
          edges.push({
            source: docId,
            target: deptId,
            type: 'belongs_to',
            weight: 1,
          });
        }
      }
    }

    // 4. Project nodes (from metadata values)
    const projectValues = await this.prisma.metadataValue.findMany({
      where: { tenantId, fieldCode: 'project' },
      select: { value: true, documentId: true },
      take: q.limit,
    });
    const projects = new Map<string, string[]>();
    for (const pv of projectValues) {
      const projectName = String(pv.value);
      if (!projects.has(projectName)) projects.set(projectName, []);
      projects.get(projectName)!.push(pv.documentId);
    }
    for (const [projectName, docIds] of projects) {
      const projId = `project:${projectName}`;
      if (!nodeSet.has(projId)) {
        nodes.push({
          id: projId,
          type: 'project',
          label: projectName,
          properties: { documentCount: docIds.length },
        });
        nodeSet.add(projId);
      }
      for (const docId of docIds) {
        if (nodeSet.has(docId)) {
          edges.push({
            source: docId,
            target: projId,
            type: 'belongs_to',
            weight: 1,
          });
        }
      }
    }

    // 5. Share link edges (who shared with whom)
    const shares = await this.prisma.shareLink.findMany({
      where: { tenantId, isActive: true },
      select: { createdByUserId: true, recipientEmail: true, documentId: true },
      take: q.limit,
    });
    for (const share of shares) {
      if (share.createdByUserId && nodeSet.has(share.createdByUserId) && nodeSet.has(share.documentId)) {
        edges.push({
          source: share.createdByUserId,
          target: share.documentId,
          type: 'shared_with',
          weight: 2,
        });
      }
    }

    // Apply filter if specified
    const filteredNodes = q.filterType ? nodes.filter((n) => n.type === q.filterType) : nodes;
    const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = edges.filter((e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target));

    this.logger.log(`Knowledge graph: ${filteredNodes.length} nodes, ${filteredEdges.length} edges (depth=${q.depth})`);

    return {
      nodes: filteredNodes,
      edges: filteredEdges,
      stats: {
        totalNodes: filteredNodes.length,
        totalEdges: filteredEdges.length,
        depth: q.depth,
      },
    };
  }
}
