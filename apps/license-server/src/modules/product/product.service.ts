import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';

export const createProductSchema = z.object({
  code: z.string().min(1).max(64),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  currentVersion: z.string().max(64).default('1.0.0'),
});

export const createPlanSchema = z.object({
  productId: z.string().uuid(),
  code: z.string().min(1).max(64),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  features: z.array(z.string()).default([]),
  limits: z.record(z.unknown()).default({}),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type CreatePlanInput = z.infer<typeof createPlanSchema>;

/**
 * Product & Plan admin service.
 *
 * Spec ref: §12.1 (Product, Plan entities), §15.2.
 *
 * Products are the offerings (e.g. "Smart EDMS Enterprise", "Smart EDMS
 * Partner Edition"). Plans are subscription tiers within a product
 * (e.g. "Starter", "Professional", "Enterprise").
 */
@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async createProduct(input: CreateProductInput, adminId: string, ipAddress?: string): Promise<unknown> {
    const existing = await this.prisma.product.findUnique({ where: { code: input.code } });
    if (existing) {
      throw new ConflictException({ messageKey: 'errors.PRODUCT_CODE_EXISTS' });
    }
    const product = await this.prisma.product.create({
      data: {
        id: randomUUID(),
        code: input.code,
        name: input.name,
        description: input.description,
        currentVersion: input.currentVersion,
      },
    });
    await this.audit.record({
      adminId,
      action: 'product.create',
      target: product.id,
      ipAddress,
      metadata: { code: product.code, name: product.name },
    });
    return product;
  }

  async listProducts(): Promise<unknown> {
    return this.prisma.product.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'asc' },
      include: { plans: true },
    });
  }

  async getProduct(id: string): Promise<unknown> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { plans: true },
    });
    if (!product || product.deletedAt) {
      throw new NotFoundException({ messageKey: 'errors.PRODUCT_NOT_FOUND' });
    }
    return product;
  }

  async createPlan(input: CreatePlanInput, adminId: string, ipAddress?: string): Promise<unknown> {
    const product = await this.prisma.product.findUnique({ where: { id: input.productId } });
    if (!product || product.deletedAt) {
      throw new NotFoundException({ messageKey: 'errors.PRODUCT_NOT_FOUND' });
    }
    const existing = await this.prisma.plan.findUnique({ where: { code: input.code } });
    if (existing) {
      throw new ConflictException({ messageKey: 'errors.PLAN_CODE_EXISTS' });
    }
    const plan = await this.prisma.plan.create({
      data: {
        id: randomUUID(),
        productId: input.productId,
        code: input.code,
        name: input.name,
        description: input.description,
        features: input.features,
        limits: input.limits,
      },
    });
    await this.audit.record({
      adminId,
      action: 'product.plan.create',
      target: plan.id,
      ipAddress,
      metadata: { code: plan.code, productId: input.productId },
    });
    return plan;
  }

  async listPlans(productId: string): Promise<unknown> {
    return this.prisma.plan.findMany({
      where: { productId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
