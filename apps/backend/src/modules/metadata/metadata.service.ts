import { Prisma } from '@prisma/client';
/**
 * Metadata schema management service (spec §9.5 — metadata, taxonomy).
 *
 * Manages configurable metadata schemas per document type. Each schema
 * defines fields (code, label key, type, required, controlled vocabulary).
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { z } from 'zod';

const metadataFieldSchema = z.object({
  code: z.string().min(1).max(64),
  labelKey: z.string().min(1).max(128),
  type: z.enum(['string', 'number', 'date', 'boolean', 'select', 'multiselect', 'json']),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(), // for select/multiselect
  defaultValue: z.unknown().optional(),
  validation: z.record(z.string(), z.unknown()).optional(),
});

const createSchemaSchema = z.object({
  code: z.string().min(1).max(64),
  name: z.string().min(1).max(128),
  documentType: z.string().max(64).optional(),
  fields: z.array(metadataFieldSchema),
  isActive: z.boolean().default(true),
});

const updateSchemaSchema = z.object({
  name: z.string().min(1).max(128).optional(),
  documentType: z.string().max(64).optional(),
  fields: z.array(metadataFieldSchema).optional(),
  isActive: z.boolean().optional(),
});

@Injectable()
export class MetadataService {
  constructor(private readonly prisma: PrismaService) {}

  async listSchemas(tenantId: string) {
    return this.prisma.metadataSchema.findMany({
      where: { tenantId },
      orderBy: { code: 'asc' },
    });
  }

  async getSchema(tenantId: string, id: string) {
    const schema = await this.prisma.metadataSchema.findFirst({ where: { id, tenantId } });
    if (!schema) {throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });}
    return schema;
  }

  async createSchema(tenantId: string, raw: unknown) {
    const input = createSchemaSchema.parse(raw);
    return this.prisma.metadataSchema.create({
      data: { tenantId, ...input, fields: input.fields as Prisma.InputJsonValue },
    });
  }

  async updateSchema(tenantId: string, id: string, raw: unknown) {
    const input = updateSchemaSchema.parse(raw);
    const existing = await this.prisma.metadataSchema.findFirst({ where: { id, tenantId } });
    if (!existing) {throw new NotFoundException({ messageKey: 'errors.NOT_FOUND' });}
    return this.prisma.metadataSchema.update({
      where: { id },
      data: { ...input, fields: input.fields as Prisma.InputJsonValue },
    });
  }

  async deleteSchema(tenantId: string, id: string) {
    await this.prisma.metadataSchema.deleteMany({ where: { id, tenantId } });
  }

  /**
   * Get metadata values for a document.
   */
  async getDocumentMetadata(tenantId: string, documentId: string) {
    return this.prisma.metadataValue.findMany({
      where: { tenantId, documentId },
      orderBy: { fieldCode: 'asc' },
    });
  }

  /**
   * Set a metadata value on a document (upsert).
   */
  async setMetadataValue(
    tenantId: string,
    documentId: string,
    fieldCode: string,
    value: unknown,
  ) {
    return this.prisma.metadataValue.upsert({
      where: { documentId_fieldCode: { documentId, fieldCode } },
      create: { tenantId, documentId, fieldCode, value: value as Prisma.InputJsonValue },
      update: { value: value as Prisma.InputJsonValue },
    });
  }

  /**
   * Remove a metadata value from a document.
   */
  async removeMetadataValue(tenantId: string, documentId: string, fieldCode: string) {
    await this.prisma.metadataValue.deleteMany({
      where: { tenantId, documentId, fieldCode },
    });
  }
}
