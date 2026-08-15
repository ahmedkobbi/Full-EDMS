import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';

export const createCustomerSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(254),
  industry: z.string().max(128).optional(),
  website: z.string().url().max(512).optional(),
  status: z.enum(['active', 'suspended', 'deleted']).default('active'),
  metadata: z.record(z.unknown()).optional(),
});

export const createContactSchema = z.object({
  customerId: z.string().uuid(),
  name: z.string().min(1).max(200),
  email: z.string().email().max(254),
  role: z.string().max(128).optional(),
  isPrimary: z.boolean().default(false),
  phone: z.string().max(64).optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type CreateContactInput = z.infer<typeof createContactSchema>;

/**
 * Customer & Contact admin service.
 *
 * Spec ref: §12.1 (Customer, Contact entities), §15.2 (licensing server
 * side entities).
 *
 * Customers are the organisations that purchase Smart EDMS licenses.
 * Contacts are the people at those organisations (admin, billing, technical).
 */
@Injectable()
export class CustomerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(input: CreateCustomerInput, adminId: string, ipAddress?: string): Promise<unknown> {
    // Email uniqueness.
    const existing = await this.prisma.customer.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new ConflictException({ messageKey: 'errors.CUSTOMER_EMAIL_EXISTS' });
    }
    const customer = await this.prisma.customer.create({
      data: {
        id: randomUUID(),
        name: input.name,
        email: input.email,
        industry: input.industry,
        website: input.website,
        status: input.status,
        metadata: (input.metadata as object) ?? undefined,
      },
    });
    await this.audit.record({
      adminId,
      action: 'customer.create',
      target: customer.id,
      customerId: customer.id,
      ipAddress,
      metadata: { name: customer.name, email: customer.email },
    });
    return customer;
  }

  async get(id: string): Promise<unknown> {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: { contacts: true },
    });
    if (!customer || customer.deletedAt) {
      throw new NotFoundException({ messageKey: 'errors.CUSTOMER_NOT_FOUND' });
    }
    return customer;
  }

  async list(input: { limit?: number; cursor?: string; status?: string }): Promise<unknown> {
    const take = Math.min(input.limit ?? 50, 200);
    const customers = await this.prisma.customer.findMany({
      where: {
        deletedAt: null,
        ...(input.status ? { status: input.status } : {}),
        ...(input.cursor ? { id: { gt: input.cursor } } : {}),
      },
      orderBy: { id: 'asc' },
      take: take + 1,
    });
    const nextCursor = customers.length > take ? customers[customers.length - 1].id : null;
    return { customers: customers.slice(0, take), nextCursor };
  }

  async update(
    id: string,
    patch: Partial<Pick<CreateCustomerInput, 'name' | 'industry' | 'website' | 'status' | 'metadata'>>,
    adminId: string,
    ipAddress?: string,
  ): Promise<unknown> {
    const existing = await this.prisma.customer.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException({ messageKey: 'errors.CUSTOMER_NOT_FOUND' });
    }
    const updated = await this.prisma.customer.update({
      where: { id },
      data: {
        ...(patch.name ? { name: patch.name } : {}),
        ...(patch.industry !== undefined ? { industry: patch.industry } : {}),
        ...(patch.website !== undefined ? { website: patch.website } : {}),
        ...(patch.status ? { status: patch.status } : {}),
        ...(patch.metadata !== undefined ? { metadata: patch.metadata as object } : {}),
      },
    });
    await this.audit.record({
      adminId,
      action: 'customer.update',
      target: id,
      customerId: id,
      ipAddress,
      metadata: { patch },
    });
    return updated;
  }

  async softDelete(id: string, adminId: string, ipAddress?: string): Promise<{ ok: true }> {
    const existing = await this.prisma.customer.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException({ messageKey: 'errors.CUSTOMER_NOT_FOUND' });
    }
    await this.prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'deleted' },
    });
    await this.audit.record({
      adminId,
      action: 'customer.delete',
      target: id,
      customerId: id,
      ipAddress,
    });
    return { ok: true };
  }

  // ── Contacts ──────────────────────────────────────────────────────────

  async addContact(input: CreateContactInput, adminId: string, ipAddress?: string): Promise<unknown> {
    const customer = await this.prisma.customer.findUnique({ where: { id: input.customerId } });
    if (!customer || customer.deletedAt) {
      throw new NotFoundException({ messageKey: 'errors.CUSTOMER_NOT_FOUND' });
    }
    // If isPrimary, demote any existing primary contacts.
    if (input.isPrimary) {
      await this.prisma.contact.updateMany({
        where: { customerId: input.customerId, isPrimary: true },
        data: { isPrimary: false },
      });
    }
    const contact = await this.prisma.contact.create({
      data: {
        id: randomUUID(),
        customerId: input.customerId,
        name: input.name,
        email: input.email,
        role: input.role,
        isPrimary: input.isPrimary,
        phone: input.phone,
      },
    });
    await this.audit.record({
      adminId,
      action: 'customer.contact.add',
      target: contact.id,
      customerId: input.customerId,
      ipAddress,
      metadata: { name: contact.name, email: contact.email },
    });
    return contact;
  }

  async listContacts(customerId: string): Promise<unknown> {
    return this.prisma.contact.findMany({
      where: { customerId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
  }
}
