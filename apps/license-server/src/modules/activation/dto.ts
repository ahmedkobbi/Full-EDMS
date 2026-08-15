import { z } from 'zod';

/**
 * Activation DTOs (spec §12.7 online activation, §12.8 offline activation).
 */

export const onlineActivationSchema = z.object({
  activationCode: z.string().min(1).max(256),
  deploymentId: z.string().uuid(),
  tenantId: z.string().uuid().nullable().optional(),
  appVersion: z.string().min(1).max(64),
  machineFingerprint: z.object({
    fingerprintHash: z.string().min(1).max(256),
    machineId: z.string().max(256).nullable().optional(),
    os: z.string().min(1).max(64),
    arch: z.string().min(1).max(64),
    attestation: z.string().max(8192).nullable().optional(),
  }),
  installationPublicKey: z.string().min(1).max(8192).optional(),
  contactEmail: z.string().email().max(254).nullable().optional(),
  nonce: z.string().min(16).max(256),
});

export type OnlineActivationInput = z.infer<typeof onlineActivationSchema>;

export const offlineRequestIntakeSchema = z.object({
  // The raw `.sedmsreq` file content (canonical JSON string).
  rawContent: z.string().min(1),
});

export type OfflineRequestIntakeInput = z.infer<typeof offlineRequestIntakeSchema>;

export const offlineIssueSchema = z.object({
  requestId: z.string().uuid(),
  // Optional: link this activation to an existing license (otherwise a
  // new license is issued from the customer's default plan).
  licenseId: z.string().uuid().optional(),
  // If no licenseId provided, the admin must specify the customer + plan
  // to issue a new license for this activation.
  customerId: z.string().uuid().optional(),
  planId: z.string().uuid().optional(),
  reviewNotes: z.string().max(2000).optional(),
});

export type OfflineIssueInput = z.infer<typeof offlineIssueSchema>;
