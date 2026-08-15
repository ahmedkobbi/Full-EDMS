import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProductService } from './product.service.js';
import { AdminJwtGuard, type AdminAuthenticatedRequest } from '../../security/admin-jwt.guard.js';
import { AuditAction } from '../../common/decorators/audit-action.decorator.js';

/**
 * Product & Plan admin endpoints.
 *
 * Spec ref: §12.1 (Product, Plan entities).
 *
 * All endpoints require admin JWT.
 */
@ApiTags('products')
@Controller('v1')
@UseGuards(AdminJwtGuard)
export class ProductController {
  constructor(private readonly product: ProductService) {}

  // ── Products ──────────────────────────────────────────────────────────

  @Post('products')
  @AuditAction('product.create')
  @ApiOperation({ summary: 'Create a product' })
  async createProduct(@Body() body: unknown, @Req() req: AdminAuthenticatedRequest) {
    return this.product.createProduct(body as never, req.admin!.sub, req.ip);
  }

  @Get('products')
  @ApiOperation({ summary: 'List all products with their plans' })
  async listProducts() {
    return this.product.listProducts();
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Get a product by ID' })
  async getProduct(@Param('id') id: string) {
    return this.product.getProduct(id);
  }

  // ── Plans ─────────────────────────────────────────────────────────────

  @Post('plans')
  @AuditAction('product.plan.create')
  @ApiOperation({ summary: 'Create a plan within a product' })
  async createPlan(@Body() body: unknown, @Req() req: AdminAuthenticatedRequest) {
    return this.product.createPlan(body as never, req.admin!.sub, req.ip);
  }

  @Get('products/:id/plans')
  @ApiOperation({ summary: 'List plans for a product' })
  async listPlans(@Param('id') id: string) {
    return this.product.listPlans(id);
  }
}
