/**
 * Smart EDMS License Admin — TanStack Query hooks for every entity managed
 * by the licensing server (spec §7.4, §12.10).
 *
 * Each hook wires a typed call into the API client. Mutations invalidate
 * the relevant list/detail query so the UI stays consistent without
 * manual refetches.
 *
 * Server-side pagination convention: list endpoints accept `limit` + `cursor`
 * and return `{ items, hasMore, nextCursor }`. The cursor is opaque (cursor
 * strings returned by the server are passed back unchanged).
 *
 * Spec ref:
 *  - §12.1  Customer, Contact, Product, Plan, License, Trial, Webhook,
 *           ApiKey, LicenseAuditLog, SigningKey
 *  - §12.4  signing keys + CRL
 *  - §12.5  license payload + signing
 *  - §12.6  offline activation request (.sedmsreq)
 *  - §12.7  online activation
 *  - §12.8  offline activation (intake + issue + reject)
 *  - §12.9  heartbeat
 *  - §12.10 admin panel requirements
 */
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch, apiDelete, apiGetBlob } from './client';
import type {
  ApiKey,
  Contact,
  Customer,
  Heartbeat,
  License,
  LicenseAuditLog,
  OfflineActivationCertificate,
  OfflineActivationRequest,
  Plan,
  Product,
  SigningKey,
  Trial,
  Webhook,
  Activation,
  Device,
  EntitlementModule,
  LicenseType,
  LicenseEnvironment,
} from '@smart-edms/types';

// ---------------------------------------------------------------------------
// Generic pagination helpers
// ---------------------------------------------------------------------------

export interface PaginatedList<T> {
  readonly items: readonly T[];
  readonly hasMore: boolean;
  readonly nextCursor: string | null;
}

export interface ListParams {
  readonly limit?: number;
  readonly cursor?: string;
}

// ---------------------------------------------------------------------------
// Auth namespace (admin login + MFA + step-up)
// ---------------------------------------------------------------------------

export interface AdminLoginResponse {
  readonly mfaTicket: string;
  readonly mfaRequired: true;
}

export interface AdminMfaVerifyResponse {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAt: string;
  readonly admin: { readonly sub: string; readonly email: string; readonly role: string };
}

export interface StepUpResponse {
  readonly stepUpToken: string;
  readonly expiresAt: string;
}

export interface AdminProfile {
  readonly sub: string;
  readonly email: string;
  readonly role: 'super_admin' | 'admin' | 'support' | 'read_only';
  readonly mfaVerifiedAt: number | null;
}

export function useAdminLoginMutation(
  options?: UseMutationOptions<AdminLoginResponse, Error, { username: string; password: string }>,
) {
  return useMutation<AdminLoginResponse, Error, { username: string; password: string }>({
    mutationFn: (body) => apiPost<AdminLoginResponse>('/auth/admin/login', body),
    ...options,
  });
}

export function useAdminMfaVerifyMutation(
  options?: UseMutationOptions<AdminMfaVerifyResponse, Error, { mfaTicket: string; code: string }>,
) {
  return useMutation<AdminMfaVerifyResponse, Error, { mfaTicket: string; code: string }>({
    mutationFn: (body) => apiPost<AdminMfaVerifyResponse>('/auth/admin/mfa/verify', body),
    ...options,
  });
}

export function useAdminStepUpMutation(
  options?: UseMutationOptions<StepUpResponse, Error, { code: string }>,
) {
  return useMutation<StepUpResponse, Error, { code: string }>({
    mutationFn: (body) => apiPost<StepUpResponse>('/auth/admin/mfa/step-up', body),
    ...options,
  });
}

export function useAdminProfileQuery(
  options?: Omit<UseQueryOptions<AdminProfile, Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<AdminProfile, Error>({
    queryKey: ['admin', 'profile'],
    queryFn: () => apiGet<AdminProfile>('/auth/admin/me'),
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Customers + Contacts
// ---------------------------------------------------------------------------

export interface CustomerListParams extends ListParams {
  readonly status?: string;
}

export function useCustomersQuery(
  params: CustomerListParams,
  options?: Omit<UseQueryOptions<PaginatedList<Customer>, Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<PaginatedList<Customer>, Error>({
    queryKey: ['customers', params],
    queryFn: () =>
      apiGet<PaginatedList<Customer>>('/customers', {
        params: { limit: params.limit, cursor: params.cursor, status: params.status },
      }),
    ...options,
  });
}

export function useCustomerQuery(
  id: string | undefined,
  options?: Omit<UseQueryOptions<Customer, Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<Customer, Error>({
    queryKey: ['customer', id],
    queryFn: () => apiGet<Customer>(`/customers/${id}`),
    enabled: !!id,
    ...options,
  });
}

export interface CustomerInput {
  readonly legalName: string;
  readonly displayName: string;
  readonly industry?: string | null;
  readonly website?: string | null;
}

export function useCreateCustomerMutation(
  options?: UseMutationOptions<Customer, Error, CustomerInput>,
) {
  const qc = useQueryClient();
  return useMutation<Customer, Error, CustomerInput>({
    mutationFn: (body) => apiPost<Customer>('/customers', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['customers'] });
    },
    ...options,
  });
}

export function useUpdateCustomerMutation(
  options?: UseMutationOptions<Customer, Error, { id: string; body: Partial<CustomerInput> }>,
) {
  const qc = useQueryClient();
  return useMutation<Customer, Error, { id: string; body: Partial<CustomerInput> }>({
    mutationFn: ({ id, body }) => apiPatch<Customer>(`/customers/${id}`, body),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ['customers'] });
      void qc.invalidateQueries({ queryKey: ['customer', data.id] });
    },
    ...options,
  });
}

export function useDeleteCustomerMutation(
  options?: UseMutationOptions<void, Error, string>,
) {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => apiDelete<void>(`/customers/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['customers'] });
    },
    ...options,
  });
}

export function useCustomerContactsQuery(
  customerId: string | undefined,
  options?: Omit<UseQueryOptions<Contact[], Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<Contact[], Error>({
    queryKey: ['customer', customerId, 'contacts'],
    queryFn: () => apiGet<Contact[]>(`/customers/${customerId}/contacts`),
    enabled: !!customerId,
    ...options,
  });
}

export interface ContactInput {
  readonly fullName: string;
  readonly email: string;
  readonly phone?: string | null;
  readonly role?: string | null;
  readonly primary?: boolean;
}

export function useAddContactMutation(
  options?: UseMutationOptions<Contact, Error, { customerId: string; body: ContactInput }>,
) {
  const qc = useQueryClient();
  return useMutation<Contact, Error, { customerId: string; body: ContactInput }>({
    mutationFn: ({ customerId, body }) =>
      apiPost<Contact>(`/customers/${customerId}/contacts`, body),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ['customer', data.customerId, 'contacts'] });
    },
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Products + Plans
// ---------------------------------------------------------------------------

export function useProductsQuery(
  options?: Omit<UseQueryOptions<Product[], Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<Product[], Error>({
    queryKey: ['products'],
    queryFn: () => apiGet<Product[]>('/products'),
    ...options,
  });
}

export function useProductQuery(
  id: string | undefined,
  options?: Omit<UseQueryOptions<Product, Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<Product, Error>({
    queryKey: ['product', id],
    queryFn: () => apiGet<Product>(`/products/${id}`),
    enabled: !!id,
    ...options,
  });
}

export interface ProductInput {
  readonly code: string;
  readonly name: string;
  readonly description?: string | null;
  readonly version?: string;
}

export function useCreateProductMutation(
  options?: UseMutationOptions<Product, Error, ProductInput>,
) {
  const qc = useQueryClient();
  return useMutation<Product, Error, ProductInput>({
    mutationFn: (body) => apiPost<Product>('/products', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['products'] });
    },
    ...options,
  });
}

export function useProductPlansQuery(
  productId: string | undefined,
  options?: Omit<UseQueryOptions<Plan[], Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<Plan[], Error>({
    queryKey: ['product', productId, 'plans'],
    queryFn: () => apiGet<Plan[]>(`/products/${productId}/plans`),
    enabled: !!productId,
    ...options,
  });
}

export interface PlanInput {
  readonly productId: string;
  readonly code: string;
  readonly name: string;
  readonly description?: string | null;
  readonly defaultEntitlements?: readonly EntitlementModule[];
  readonly defaultLimits?: Record<string, unknown>;
}

export function useCreatePlanMutation(
  options?: UseMutationOptions<Plan, Error, PlanInput>,
) {
  const qc = useQueryClient();
  return useMutation<Plan, Error, PlanInput>({
    mutationFn: (body) => apiPost<Plan>('/plans', body),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ['product', data.productId, 'plans'] });
    },
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Licenses (issue, renew, revoke, list, detail, activations, devices, heartbeats)
// ---------------------------------------------------------------------------

export interface LicenseListParams extends ListParams {
  readonly customerId?: string;
  readonly productId?: string;
  readonly status?: string;
  readonly code?: string;
}

export function useLicensesQuery(
  params: LicenseListParams,
  options?: Omit<UseQueryOptions<PaginatedList<License>, Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<PaginatedList<License>, Error>({
    queryKey: ['licenses', params],
    queryFn: () =>
      apiGet<PaginatedList<License>>('/licenses', {
        params: {
          limit: params.limit,
          cursor: params.cursor,
          customerId: params.customerId,
          productId: params.productId,
          status: params.status,
          code: params.code,
        },
      }),
    ...options,
  });
}

export function useLicenseQuery(
  id: string | undefined,
  options?: Omit<UseQueryOptions<License, Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<License, Error>({
    queryKey: ['license', id],
    queryFn: () => apiGet<License>(`/licenses/${id}`),
    enabled: !!id,
    ...options,
  });
}

export interface IssueLicenseInput {
  readonly customerId: string;
  readonly productId: string;
  readonly planId: string;
  readonly type: LicenseType;
  readonly environment: LicenseEnvironment;
  readonly startsAt: string;
  readonly expiresAt?: string | null;
  readonly gracePeriodDays?: number;
  readonly entitlements?: readonly EntitlementModule[];
  readonly limits?: Record<string, unknown>;
  readonly offline?: Record<string, unknown>;
  readonly supportLevel?: string;
}

export function useIssueLicenseMutation(
  options?: UseMutationOptions<License, Error, IssueLicenseInput>,
) {
  const qc = useQueryClient();
  return useMutation<License, Error, IssueLicenseInput>({
    mutationFn: (body) => apiPost<License>('/licenses', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['licenses'] });
    },
    ...options,
  });
}

export interface RenewLicenseInput {
  readonly id: string;
  readonly expiresAt?: string | null;
  readonly gracePeriodDays?: number;
}

export function useRenewLicenseMutation(
  options?: UseMutationOptions<License, Error, RenewLicenseInput>,
) {
  const qc = useQueryClient();
  return useMutation<License, Error, RenewLicenseInput>({
    mutationFn: ({ id, ...body }) => apiPatch<License>(`/licenses/${id}/renew`, body),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ['licenses'] });
      void qc.invalidateQueries({ queryKey: ['license', data.id] });
    },
    ...options,
  });
}

export interface RevokeLicenseInput {
  readonly id: string;
  readonly reason: string;
}

export function useRevokeLicenseMutation(
  options?: UseMutationOptions<License, Error, RevokeLicenseInput>,
) {
  const qc = useQueryClient();
  return useMutation<License, Error, RevokeLicenseInput>({
    // Step-up auth: the API client attaches the step-up token from the
    // auth store via the `X-Step-Up-Token` header. The server's StepUpGuard
    // verifies it.
    mutationFn: ({ id, ...body }) => apiPost<License>(`/licenses/${id}/revoke`, body),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ['licenses'] });
      void qc.invalidateQueries({ queryKey: ['license', data.id] });
    },
    ...options,
  });
}

export function useLicenseActivationsQuery(
  licenseId: string | undefined,
  options?: Omit<UseQueryOptions<Activation[], Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<Activation[], Error>({
    queryKey: ['license', licenseId, 'activations'],
    queryFn: () => apiGet<Activation[]>(`/licenses/${licenseId}/activations`),
    enabled: !!licenseId,
    ...options,
  });
}

export function useLicenseDevicesQuery(
  licenseId: string | undefined,
  options?: Omit<UseQueryOptions<Device[], Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<Device[], Error>({
    queryKey: ['license', licenseId, 'devices'],
    queryFn: () => apiGet<Device[]>(`/licenses/${licenseId}/devices`),
    enabled: !!licenseId,
    ...options,
  });
}

export function useLicenseHeartbeatsQuery(
  licenseId: string | undefined,
  options?: Omit<UseQueryOptions<Heartbeat[], Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<Heartbeat[], Error>({
    queryKey: ['license', licenseId, 'heartbeats'],
    queryFn: () => apiGet<Heartbeat[]>(`/licenses/${licenseId}/heartbeats`, { params: { limit: 50 } }),
    enabled: !!licenseId,
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Offline activation (.sedmsreq intake / issue / reject)
// ---------------------------------------------------------------------------

export function useOfflineRequestsQuery(
  params: { status?: string; limit?: number },
  options?: Omit<UseQueryOptions<OfflineActivationRequest[], Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<OfflineActivationRequest[], Error>({
    queryKey: ['offline-requests', params],
    queryFn: () =>
      apiGet<OfflineActivationRequest[]>('/activate/offline-requests', {
        params: { status: params.status, limit: params.limit ?? 50 },
      }),
    ...options,
  });
}

export function useOfflineRequestQuery(
  id: string | undefined,
  options?: Omit<UseQueryOptions<OfflineActivationRequest, Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<OfflineActivationRequest, Error>({
    queryKey: ['offline-request', id],
    queryFn: () => apiGet<OfflineActivationRequest>(`/activate/offline-requests/${id}`),
    enabled: !!id,
    ...options,
  });
}

export function useIntakeOfflineRequestMutation(
  options?: UseMutationOptions<OfflineActivationRequest, Error, { rawRequest: unknown }>,
) {
  const qc = useQueryClient();
  return useMutation<OfflineActivationRequest, Error, { rawRequest: unknown }>({
    mutationFn: (body) => apiPost<OfflineActivationRequest>('/activate/offline-request', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['offline-requests'] });
    },
    ...options,
  });
}

export interface IssueOfflineLicenseInput {
  readonly requestId: string;
  readonly customerId: string;
  readonly planId: string;
  readonly type?: LicenseType;
  readonly environment?: LicenseEnvironment;
  readonly expiresAt?: string | null;
  readonly gracePeriodDays?: number;
}

export function useIssueOfflineLicenseMutation(
  options?: UseMutationOptions<OfflineActivationCertificate, Error, IssueOfflineLicenseInput>,
) {
  const qc = useQueryClient();
  return useMutation<OfflineActivationCertificate, Error, IssueOfflineLicenseInput>({
    mutationFn: (body) => apiPost<OfflineActivationCertificate>('/activate/offline-issue', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['offline-requests'] });
      void qc.invalidateQueries({ queryKey: ['licenses'] });
    },
    ...options,
  });
}

export function useRejectOfflineRequestMutation(
  options?: UseMutationOptions<OfflineActivationRequest, Error, { id: string; reason: string }>,
) {
  const qc = useQueryClient();
  return useMutation<OfflineActivationRequest, Error, { id: string; reason: string }>({
    mutationFn: ({ id, reason }) =>
      apiPost<OfflineActivationRequest>(`/activate/offline-reject/${id}`, { reason }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['offline-requests'] });
    },
    ...options,
  });
}

/**
 * Download the issued `.sedmslic` artifact as a Blob. The browser then
 * triggers a save-as dialog (handled by the calling component).
 */
export async function downloadOfflineLicense(
  certificateId: string,
): Promise<Blob> {
  return apiGetBlob(`/activate/offline-certificates/${certificateId}/download`);
}

// ---------------------------------------------------------------------------
// Trials
// ---------------------------------------------------------------------------

export interface TrialListParams {
  readonly customerId?: string;
  readonly status?: string;
  readonly limit?: number;
}

export function useTrialsQuery(
  params: TrialListParams,
  options?: Omit<UseQueryOptions<Trial[], Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<Trial[], Error>({
    queryKey: ['trials', params],
    queryFn: () =>
      apiGet<Trial[]>('/trials', {
        params: {
          customerId: params.customerId,
          status: params.status,
          limit: params.limit ?? 50,
        },
      }),
    ...options,
  });
}

export function useTrialQuery(
  id: string | undefined,
  options?: Omit<UseQueryOptions<Trial, Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<Trial, Error>({
    queryKey: ['trial', id],
    queryFn: () => apiGet<Trial>(`/trials/${id}`),
    enabled: !!id,
    ...options,
  });
}

export interface TrialInput {
  readonly customerId: string;
  readonly productId: string;
  readonly durationDays: number;
  readonly contactEmail?: string | null;
}

export function useCreateTrialMutation(
  options?: UseMutationOptions<Trial, Error, TrialInput>,
) {
  const qc = useQueryClient();
  return useMutation<Trial, Error, TrialInput>({
    mutationFn: (body) => apiPost<Trial>('/trials', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['trials'] });
    },
    ...options,
  });
}

export interface TrialConvertInput {
  readonly id: string;
  readonly planId: string;
  readonly type: 'subscription' | 'perpetual' | 'enterprise';
  readonly durationDays?: number;
}

export function useConvertTrialMutation(
  options?: UseMutationOptions<License, Error, TrialConvertInput>,
) {
  const qc = useQueryClient();
  return useMutation<License, Error, TrialConvertInput>({
    mutationFn: ({ id, ...body }) => apiPost<License>(`/trials/${id}/convert`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['trials'] });
      void qc.invalidateQueries({ queryKey: ['licenses'] });
    },
    ...options,
  });
}

export function useCancelTrialMutation(
  options?: UseMutationOptions<Trial, Error, string>,
) {
  const qc = useQueryClient();
  return useMutation<Trial, Error, string>({
    mutationFn: (id) => apiPost<Trial>(`/trials/${id}/cancel`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['trials'] });
    },
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Webhooks (+ deliveries + replay + test)
// ---------------------------------------------------------------------------

export function useWebhooksQuery(
  customerId: string | undefined,
  options?: Omit<UseQueryOptions<Webhook[], Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<Webhook[], Error>({
    queryKey: ['webhooks', customerId],
    queryFn: () => apiGet<Webhook[]>('/webhooks', { params: { customerId } }),
    enabled: !!customerId,
    ...options,
  });
}

export interface WebhookInput {
  readonly customerId: string;
  readonly url: string;
  readonly events: readonly string[];
  readonly enabled?: boolean;
}

export function useCreateWebhookMutation(
  options?: UseMutationOptions<Webhook, Error, WebhookInput>,
) {
  const qc = useQueryClient();
  return useMutation<Webhook, Error, WebhookInput>({
    mutationFn: (body) => apiPost<Webhook>('/webhooks', body),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ['webhooks', data.customerId] });
    },
    ...options,
  });
}

export function useDeleteWebhookMutation(
  options?: UseMutationOptions<void, Error, { id: string; customerId: string }>,
) {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string; customerId: string }>({
    mutationFn: ({ id }) => apiDelete<void>(`/webhooks/${id}`),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ['webhooks', vars.customerId] });
    },
    ...options,
  });
}

export interface WebhookDelivery {
  readonly id: string;
  readonly webhookId: string;
  readonly event: string;
  readonly status: 'pending' | 'success' | 'failed' | 'retrying';
  readonly statusCode: number | null;
  readonly attemptCount: number;
  readonly deliveredAt: string | null;
  readonly nextRetryAt: string | null;
  readonly responseBody: string | null;
}

export function useWebhookDeliveriesQuery(
  webhookId: string | undefined,
  options?: Omit<UseQueryOptions<WebhookDelivery[], Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<WebhookDelivery[], Error>({
    queryKey: ['webhook', webhookId, 'deliveries'],
    queryFn: () => apiGet<WebhookDelivery[]>(`/webhooks/${webhookId}/deliveries`),
    enabled: !!webhookId,
    ...options,
  });
}

export function useReplayWebhookDeliveryMutation(
  options?: UseMutationOptions<WebhookDelivery, Error, string>,
) {
  const qc = useQueryClient();
  return useMutation<WebhookDelivery, Error, string>({
    mutationFn: (id) => apiPost<WebhookDelivery>(`/webhooks/deliveries/${id}/replay`),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ['webhook', data.webhookId, 'deliveries'] });
    },
    ...options,
  });
}

/**
 * Send a test event to a webhook. The licensing server's `/v1/webhooks/:id/test`
 * endpoint dispatches a synthetic `webhook.test` event and records the
 * delivery attempt; the admin sees the result in the deliveries list.
 */
export function useTestWebhookMutation(
  options?: UseMutationOptions<WebhookDelivery, Error, string>,
) {
  const qc = useQueryClient();
  return useMutation<WebhookDelivery, Error, string>({
    mutationFn: (id) => apiPost<WebhookDelivery>(`/webhooks/${id}/test`),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ['webhook', data.webhookId, 'deliveries'] });
    },
    ...options,
  });
}

// ---------------------------------------------------------------------------
// API keys (raw key shown ONCE on creation)
// ---------------------------------------------------------------------------

export function useApiKeysQuery(
  customerId: string | undefined,
  options?: Omit<UseQueryOptions<ApiKey[], Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<ApiKey[], Error>({
    queryKey: ['api-keys', customerId],
    queryFn: () => apiGet<ApiKey[]>('/api-keys', { params: { customerId } }),
    enabled: !!customerId,
    ...options,
  });
}

export interface CreateApiKeyInput {
  readonly customerId: string;
  readonly name: string;
  readonly scopes: readonly string[];
  readonly expiresAt?: string | null;
}

export interface CreateApiKeyResponse {
  readonly apiKey: ApiKey;
  /** Raw key — shown ONCE on creation, never retrievable again. */
  readonly key: string;
}

export function useCreateApiKeyMutation(
  options?: UseMutationOptions<CreateApiKeyResponse, Error, CreateApiKeyInput>,
) {
  const qc = useQueryClient();
  return useMutation<CreateApiKeyResponse, Error, CreateApiKeyInput>({
    mutationFn: (body) => apiPost<CreateApiKeyResponse>('/api-keys', body),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ['api-keys', data.apiKey.customerId] });
    },
    ...options,
  });
}

/**
 * Revoke an API key. Step-up auth required (the API client attaches the
 * step-up token via `X-Step-Up-Token`).
 */
export function useRevokeApiKeyMutation(
  options?: UseMutationOptions<void, Error, { id: string; customerId: string }>,
) {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string; customerId: string }>({
    mutationFn: ({ id }) => apiDelete<void>(`/api-keys/${id}`),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ['api-keys', vars.customerId] });
    },
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Audit log (license-server audit, distinct from EDMS audit)
// ---------------------------------------------------------------------------

export interface AuditLogListParams extends ListParams {
  readonly action?: string;
  readonly customerId?: string;
}

export function useAuditLogsQuery(
  params: AuditLogListParams,
  options?: Omit<UseQueryOptions<PaginatedList<LicenseAuditLog>, Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<PaginatedList<LicenseAuditLog>, Error>({
    queryKey: ['audit', params],
    queryFn: () =>
      apiGet<PaginatedList<LicenseAuditLog>>('/audit', {
        params: {
          limit: params.limit ?? 100,
          cursor: params.cursor,
          action: params.action,
          customerId: params.customerId,
        },
      }),
    ...options,
  });
}

export interface AuditVerifyResult {
  readonly ok: boolean;
  readonly firstBrokenSequence?: number;
  readonly checkedCount?: number;
}

export function useAuditVerifyQuery(
  options?: Omit<UseQueryOptions<AuditVerifyResult, Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<AuditVerifyResult, Error>({
    queryKey: ['audit', 'verify'],
    queryFn: () => apiGet<AuditVerifyResult>('/audit/verify'),
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Signing keys
// ---------------------------------------------------------------------------

export function useSigningKeysQuery(
  options?: Omit<UseQueryOptions<{ keys: SigningKey[] }, Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<{ keys: SigningKey[] }, Error>({
    queryKey: ['signing-keys'],
    queryFn: () => apiGet<{ keys: SigningKey[] }>('/signing-keys'),
    ...options,
  });
}

export interface ActiveSigningKey {
  readonly loaded: boolean;
  readonly kid?: string;
  readonly algorithm?: string;
  readonly publicKey?: string;
  readonly status?: string;
  readonly createdAt?: string;
}

export function useActiveSigningKeyQuery(
  options?: Omit<UseQueryOptions<ActiveSigningKey, Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<ActiveSigningKey, Error>({
    queryKey: ['signing-keys', 'active'],
    queryFn: () => apiGet<ActiveSigningKey>('/signing-keys/active'),
    ...options,
  });
}

export interface RotateSigningKeyInput {
  readonly targetKeyPath: string;
  readonly alg?: 'ed25519' | 'rsa-pss-sha256' | 'ecdsa-p256-sha256';
}

export function useRotateSigningKeyMutation(
  options?: UseMutationOptions<SigningKey, Error, RotateSigningKeyInput>,
) {
  const qc = useQueryClient();
  return useMutation<SigningKey, Error, RotateSigningKeyInput>({
    // Step-up auth required — the API client attaches the step-up token.
    mutationFn: (body) => apiPost<SigningKey>('/signing-keys/rotate', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['signing-keys'] });
    },
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Dashboard KPIs (aggregate)
// ---------------------------------------------------------------------------

export interface DashboardKpis {
  readonly totalLicenses: number;
  readonly activeLicenses: number;
  readonly expiringWithin30Days: number;
  readonly totalActivations: number;
  readonly totalCustomers: number;
  readonly totalTrials: number;
  readonly trialsConvertedThisMonth: number;
  readonly offlineRequestsPending: number;
}

export function useDashboardKpisQuery(
  options?: Omit<UseQueryOptions<DashboardKpis, Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<DashboardKpis, Error>({
    queryKey: ['dashboard', 'kpis'],
    queryFn: () => apiGet<DashboardKpis>('/dashboard/kpis'),
    staleTime: 60_000,
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Usage metrics (spec §12.1)
// ---------------------------------------------------------------------------

export interface UsageAggregate {
  totalLicenses: number;
  totalActivations: number;
  totalUsers: number;
  totalStorageBytes: string;
  totalDocuments: number;
  totalAiCalls: number;
}

export function useUsageAggregateQuery(
  options?: Omit<UseQueryOptions<UsageAggregate, Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<UsageAggregate, Error>({
    queryKey: ['usage', 'aggregate'],
    queryFn: () => apiGet<UsageAggregate>('/usage/aggregate'),
    staleTime: 60_000,
    ...options,
  });
}

export function useLicenseUsageQuery(
  licenseId: string | undefined,
  options?: Omit<UseQueryOptions<Array<{ metric: string; value: string; recordedAt: string }>, Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<Array<{ metric: string; value: string; recordedAt: string }>, Error>({
    queryKey: licenseId ? ['usage', 'license', licenseId, 'latest'] : ['usage', 'undefined'],
    queryFn: () => apiGet(`/usage/license/${licenseId}/latest`),
    enabled: !!licenseId,
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Admin users (spec §12.1, §12.10)
// ---------------------------------------------------------------------------

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  isActive: boolean;
  mfaEnabled: boolean;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  createdAt: string;
}

export function useAdminUsersQuery(
  options?: Omit<UseQueryOptions<AdminUser[], Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<AdminUser[], Error>({
    queryKey: ['admin-users'],
    queryFn: () => apiGet<AdminUser[]>('/admin-users'),
    ...options,
  });
}

export function useCreateAdminUserMutation(
  options?: UseMutationOptions<AdminUser, Error, Record<string, unknown>>,
) {
  const qc = useQueryClient();
  return useMutation<AdminUser, Error, Record<string, unknown>>({
    mutationFn: (input) => apiPost<AdminUser>('/admin-users', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
    ...options,
  });
}

export function useSuspendAdminUserMutation(
  options?: UseMutationOptions<{ ok: true }, Error, string>,
) {
  const qc = useQueryClient();
  return useMutation<{ ok: true }, Error, string>({
    mutationFn: (id) => apiPost<{ ok: true }>(`/admin-users/${id}/suspend`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
    ...options,
  });
}

export function useDeleteAdminUserMutation(
  options?: UseMutationOptions<{ ok: true }, Error, string>,
) {
  const qc = useQueryClient();
  return useMutation<{ ok: true }, Error, string>({
    mutationFn: (id) => apiDelete<{ ok: true }>(`/admin-users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Webhook test (spec §12.10)
// ---------------------------------------------------------------------------

export function useWebhookTestMutation(
  options?: UseMutationOptions<{ ok: true }, Error, string>,
) {
  return useMutation<{ ok: true }, Error, string>({
    mutationFn: (id) => apiPost<{ ok: true }>(`/webhooks/${id}/test`, {}),
    ...options,
  });
}
