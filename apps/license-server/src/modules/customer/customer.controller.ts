import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CustomerService } from './customer.service.js';
import { AdminJwtGuard, type AdminAuthenticatedRequest } from '../../security/admin-jwt.guard.js';
import { AuditAction } from '../../common/decorators/audit-action.decorator.js';

/**
 * Customer admin endpoints.
 *
 * Spec ref: §12.1 (Customer, Contact entities).
 *
 * All endpoints require admin JWT.
 */
@ApiTags('customers')
@Controller('v1/customers')
@UseGuards(AdminJwtGuard)
export class CustomerController {
  constructor(private readonly customer: CustomerService) {}

  @Post()
  @AuditAction('customer.create')
  @ApiOperation({ summary: 'Create a customer' })
  async create(@Body() body: unknown, @Req() req: AdminAuthenticatedRequest) {
    return this.customer.create(body as never, req.admin!.sub, req.ip);
  }

  @Get()
  @ApiOperation({ summary: 'List customers (paginated)' })
  async list(
    @Query('limit') limit: string | undefined,
    @Query('cursor') cursor: string | undefined,
    @Query('status') status: string | undefined,
  ) {
    return this.customer.list({
      limit: limit ? Number(limit) : 50,
      cursor,
      status,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a customer by ID' })
  async get(@Param('id') id: string) {
    return this.customer.get(id);
  }

  @Patch(':id')
  @AuditAction('customer.update')
  @ApiOperation({ summary: 'Update a customer' })
  async update(@Param('id') id: string, @Body() body: unknown, @Req() req: AdminAuthenticatedRequest) {
    return this.customer.update(id, body as never, req.admin!.sub, req.ip);
  }

  @Delete(':id')
  @AuditAction('customer.delete')
  @HttpCode(204)
  @ApiOperation({ summary: 'Soft-delete a customer' })
  async delete(@Param('id') id: string, @Req() req: AdminAuthenticatedRequest) {
    await this.customer.softDelete(id, req.admin!.sub, req.ip);
  }

  // ── Contacts ────────────────────────────────────────────────────────

  @Post(':id/contacts')
  @AuditAction('customer.contact.add')
  @ApiOperation({ summary: 'Add a contact to a customer' })
  async addContact(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: AdminAuthenticatedRequest,
  ) {
    return this.customer.addContact(
      { ...(body as object), customerId: id } as never,
      req.admin!.sub,
      req.ip,
    );
  }

  @Get(':id/contacts')
  @ApiOperation({ summary: 'List contacts for a customer' })
  async listContacts(@Param('id') id: string) {
    return this.customer.listContacts(id);
  }
}
