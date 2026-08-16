/**
 * Smart EDMS TanStack Query hooks (spec §14).
 *
 * Thin wrappers around the API client that:
 *  - Use TanStack Query for caching, deduplication, and background refetch.
 *  - Return typed data (no `any`).
 *  - Surface errors as `ApiError` so the UI can render `t(error.messageKey)`.
 *  - Are organized by domain (auth, documents, workflows, audit, etc.).
 *
 * All hooks accept the standard TanStack Query options (enabled, refetchInterval,
 * etc.) so consumers can customize behaviour.
 */
import {
  useMutation,
  type UseMutationOptions,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import type {
  AssistantSession,
  AuditEvent,
  Citation,
  CursorPaginationParams,
  Document,
  HealthCheck,
  LicenseLocalState,
  PaginatedResponse,
  ScannerJob,
  ScannerProfile,
  SearchHit,
  TourChecklistItem,
  TourDefinition,
  TourStep,
  TourUserState,
  User,
  WorkflowDefinition,
  WorkflowInstance,
} from '@smart-edms/types';
import { apiDelete, apiGet, apiPatch, apiPost, toApiError } from './client';
import type { ApiError } from '@smart-edms/types';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const queryKeys = {
  documents: (params?: CursorPaginationParams) => ['documents', params] as const,
  document: (id: string) => ['document', id] as const,
  health: () => ['health'] as const,
  me: () => ['me'] as const,
  tours: () => ['tours'] as const,
  tour: (tourId: string) => ['tour', tourId] as const,
  tourSteps: (tourId: string) => ['tour', tourId, 'steps'] as const,
  tourUserState: (tourId: string) => ['tour', tourId, 'userState'] as const,
  tourChecklist: (tourId: string) => ['tour', tourId, 'checklist'] as const,
  license: () => ['license'] as const,
  aiSession: (sessionId: string) => ['ai', 'session', sessionId] as const,
  aiMessages: (sessionId: string) => ['ai', 'messages', sessionId] as const,
  audit: (params?: Record<string, unknown>) => ['audit', params] as const,
  scannerProfiles: () => ['scanner', 'profiles'] as const,
  scannerJobs: (params?: Record<string, unknown>) => ['scanner', 'jobs', params] as const,
  workflows: (params?: Record<string, unknown>) => ['workflows', params] as const,
  workflowInstances: (params?: Record<string, unknown>) => ['workflowInstances', params] as const,
  search: (query: string, params?: Record<string, unknown>) => ['search', query, params] as const,
  adminDashboard: () => ['admin', 'dashboard'] as const,
} as const;

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface LoginInput {
  email: string;
  password: string;
  mfaChallengeResponse?: string;
  tenantSlug?: string;
  locale?: string;
}

export interface LoginOutput {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  refreshExpiresAt: string;
  tenantId: string;
  userId: string;
  mfaRequired: boolean;
}

/** Login mutation. On success, the auth store persists the tokens. */
export function useLoginMutation(
  options?: UseMutationOptions<LoginOutput, ApiError, LoginInput>,
) {
  return useMutation<LoginOutput, ApiError, LoginInput>({
    mutationFn: (input) => apiPost<LoginOutput>('/auth/login', input),
    ...options,
  });
}

/** Fetch the current user profile. */
export function useCurrentUser(
  options?: Omit<UseQueryOptions<User, ApiError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<User, ApiError>({
    queryKey: queryKeys.me(),
    queryFn: () => apiGet<User>('/auth/me'),
    retry: false,
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

/** List documents (cursor pagination, server-side). */
export function useDocumentsQuery(
  params: CursorPaginationParams = {},
  options?: Omit<UseQueryOptions<PaginatedResponse<Document>, ApiError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<PaginatedResponse<Document>, ApiError>({
    queryKey: queryKeys.documents(params),
    queryFn: () =>
      apiGet<PaginatedResponse<Document>>('/documents', {
        params: {
          limit: params.limit ?? 25,
          cursor: params.cursor,
          sort: typeof params.sort === 'string' ? params.sort : undefined,
        },
      }),
    ...options,
  });
}

/** Fetch a single document by id. */
export function useDocumentQuery(
  id: string | undefined,
  options?: Omit<UseQueryOptions<Document, ApiError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<Document, ApiError>({
    queryKey: id ? queryKeys.document(id) : ['document', 'undefined'],
    queryFn: () => apiGet<Document>(`/documents/${id}`),
    enabled: !!id,
    ...options,
  });
}

/** Upload a document (multipart/form-data). */
export function useUploadDocumentMutation(
  options?: UseMutationOptions<Document, ApiError, { file: File; folderId?: string }>,
) {
  return useMutation<Document, ApiError, { file: File; folderId?: string }>({
    mutationFn: async ({ file, folderId }) => {
      const form = new FormData();
      form.append('file', file);
      if (folderId) {form.append('folderId', folderId);}
      const res = await apiPost<Document>('/documents/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res;
    },
    ...options,
  });
}

/** Delete a document. */
export function useDeleteDocumentMutation(
  options?: UseMutationOptions<void, ApiError, string>,
) {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => apiDelete<void>(`/documents/${id}`).then(() => undefined),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['documents'] });
      qc.invalidateQueries({ queryKey: queryKeys.document(id) });
    },
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export function useHealthQuery(
  options?: Omit<UseQueryOptions<HealthCheck, ApiError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<HealthCheck, ApiError>({
    queryKey: queryKeys.health(),
    queryFn: () => apiGet<HealthCheck>('/health'),
    staleTime: 30_000,
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Tours (spec §10)
// ---------------------------------------------------------------------------

/** List tours visible to the current user (filtered by audience/license). */
export function useToursQuery(
  options?: Omit<UseQueryOptions<TourDefinition[], ApiError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<TourDefinition[], ApiError>({
    queryKey: queryKeys.tours(),
    queryFn: () => apiGet<TourDefinition[]>('/tours'),
    ...options,
  });
}

/**
 * Fetch a single tour definition with its steps. Used by the TourEngine to
 * render real step data instead of a stubbed empty list.
 *
 * Spec ref: §10.11 (tour data model), §10.12 (tour API — GET /v1/tours/:tourId).
 */
export function useTourStepsQuery(
  tourId: string | undefined,
  options?: Omit<UseQueryOptions<TourStep[], ApiError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<TourStep[], ApiError>({
    queryKey: tourId ? queryKeys.tourSteps(tourId) : ['tour', 'undefined', 'steps'],
    queryFn: () => apiGet<TourStep[]>(`/tours/${tourId}`),
    enabled: !!tourId,
    staleTime: 5 * 60 * 1000, // tour definitions rarely change
    ...options,
  });
}

/** Fetch the current user's state for a tour (progress, status). */
export function useTourUserStateQuery(
  tourId: string | undefined,
  options?: Omit<UseQueryOptions<TourUserState, ApiError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<TourUserState, ApiError>({
    queryKey: tourId ? queryKeys.tourUserState(tourId) : ['tour', 'undefined', 'userState'],
    queryFn: () => apiGet<TourUserState>(`/tours/${tourId}/state`),
    enabled: !!tourId,
    ...options,
  });
}

/** Fetch the checklist for a tour (completion based on REAL backend state). */
export function useTourChecklistQuery(
  tourId: string | undefined,
  options?: Omit<UseQueryOptions<TourChecklistItem[], ApiError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<TourChecklistItem[], ApiError>({
    queryKey: tourId ? queryKeys.tourChecklist(tourId) : ['tour', 'undefined', 'checklist'],
    queryFn: () => apiGet<TourChecklistItem[]>(`/tours/${tourId}/checklist`),
    enabled: !!tourId,
    ...options,
  });
}

/** Report tour progress to the backend (spec §10.5). */
export function useReportTourProgressMutation(
  tourId: string,
  options?: UseMutationOptions<
    void,
    ApiError,
    { currentStepOrder: number; totalSteps: number; resumed: boolean }
  >,
) {
  return useMutation<
    void,
    ApiError,
    { currentStepOrder: number; totalSteps: number; resumed: boolean }
  >({
    mutationFn: (input) =>
      apiPost<void>(`/tours/${tourId}/progress`, input).then(() => undefined),
    ...options,
  });
}

/** Mark a tour as skipped or completed. */
export function useUpdateTourStateMutation(
  tourId: string,
  options?: UseMutationOptions<TourUserState, ApiError, { status: 'completed' | 'skipped' | 'dismissed'; doNotShowAgain?: boolean }>,
) {
  const qc = useQueryClient();
  return useMutation<
    TourUserState,
    ApiError,
    { status: 'completed' | 'skipped' | 'dismissed'; doNotShowAgain?: boolean }
  >({
    mutationFn: (input) => apiPatch<TourUserState>(`/tours/${tourId}/state`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tourUserState(tourId) });
      qc.invalidateQueries({ queryKey: queryKeys.tours() });
    },
    ...options,
  });
}

// ---------------------------------------------------------------------------
// AI Assistant (spec §11)
// ---------------------------------------------------------------------------

/** Start a new AI assistant session. */
export function useStartAiSessionMutation(
  options?: UseMutationOptions<AssistantSession, ApiError, { locale: string }>,
) {
  return useMutation<AssistantSession, ApiError, { locale: string }>({
    mutationFn: (input) => apiPost<AssistantSession>('/ai/assistant/sessions', input),
    ...options,
  });
}

/**
 * Send a message to the assistant via the chat endpoint.
 * The backend's POST /v1/ai/assistant/chat accepts { message, sessionId?, locale }
 * and returns the full response (content, citations, suggestedActions, disclaimerKey).
 *
 * Spec ref: §11.6 (AI API Contract — POST /v1/ai/assistant/chat).
 */
export function useSendAiMessageMutation(
  sessionId: string | null,
  options?: UseMutationOptions<
    {
      messageId: string;
      sessionId: string;
      content: string;
      citations: Citation[];
      suggestedActions?: unknown[];
      disclaimerKey?: string;
    },
    ApiError,
    { content: string; locale?: string }
  >,
) {
  return useMutation<
    {
      messageId: string;
      sessionId: string;
      content: string;
      citations: Citation[];
      suggestedActions?: unknown[];
      disclaimerKey?: string;
    },
    ApiError,
    { content: string; locale?: string }
  >({
    mutationFn: (input) =>
      apiPost('/ai/assistant/chat', {
        message: input.content,
        sessionId: sessionId ?? undefined,
        locale: input.locale,
      }),
    ...options,
  });
}

// ---------------------------------------------------------------------------
// License (spec §12)
// ---------------------------------------------------------------------------

export function useLicenseStateQuery(
  options?: Omit<UseQueryOptions<LicenseLocalState, ApiError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<LicenseLocalState, ApiError>({
    queryKey: queryKeys.license(),
    queryFn: () => apiGet<LicenseLocalState>('/license/state'),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/** Import a .sedmslic license file (multipart upload). */
export function useImportLicenseMutation(
  options?: UseMutationOptions<LicenseLocalState, ApiError, { file: File }>,
) {
  const qc = useQueryClient();
  return useMutation<LicenseLocalState, ApiError, { file: File }>({
    mutationFn: async ({ file }) => {
      const form = new FormData();
      form.append('file', file);
      return apiPost<LicenseLocalState>('/license/import', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.license() });
    },
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Audit (spec §9.12)
// ---------------------------------------------------------------------------

export function useAuditEventsQuery(
  params: {
    limit?: number;
    cursor?: string;
    category?: string;
    result?: 'allow' | 'deny';
    from?: string;
    to?: string;
  } = {},
  options?: Omit<UseQueryOptions<PaginatedResponse<AuditEvent>, ApiError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<PaginatedResponse<AuditEvent>, ApiError>({
    queryKey: queryKeys.audit(params),
    queryFn: () => apiGet<PaginatedResponse<AuditEvent>>('/audit/events', { params }),
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Scanner (spec §9.16)
// ---------------------------------------------------------------------------

export function useScannerProfilesQuery(
  options?: Omit<UseQueryOptions<ScannerProfile[], ApiError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<ScannerProfile[], ApiError>({
    queryKey: queryKeys.scannerProfiles(),
    queryFn: () => apiGet<ScannerProfile[]>('/scanner/profiles'),
    ...options,
  });
}

export function useScannerJobsQuery(
  params: { limit?: number; status?: string } = {},
  options?: Omit<UseQueryOptions<PaginatedResponse<ScannerJob>, ApiError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<PaginatedResponse<ScannerJob>, ApiError>({
    queryKey: queryKeys.scannerJobs(params),
    queryFn: () => apiGet<PaginatedResponse<ScannerJob>>('/scanner/jobs', { params }),
    ...options,
  });
}

export function useCreateScannerProfileMutation(
  options?: UseMutationOptions<ScannerProfile, ApiError, Record<string, unknown>>,
) {
  const qc = useQueryClient();
  return useMutation<ScannerProfile, ApiError, Record<string, unknown>>({
    mutationFn: (input) => apiPost<ScannerProfile>('/scanner/profiles', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.scannerProfiles() }),
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Workflows (spec §9.8)
// ---------------------------------------------------------------------------

export function useWorkflowDefinitionsQuery(
  params: { limit?: number; status?: string } = {},
  options?: Omit<UseQueryOptions<PaginatedResponse<WorkflowDefinition>, ApiError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<PaginatedResponse<WorkflowDefinition>, ApiError>({
    queryKey: queryKeys.workflows(params),
    queryFn: () => apiGet<PaginatedResponse<WorkflowDefinition>>('/workflows', { params }),
    ...options,
  });
}

export function useWorkflowInstancesQuery(
  params: { limit?: number; status?: string; documentId?: string } = {},
  options?: Omit<UseQueryOptions<PaginatedResponse<WorkflowInstance>, ApiError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<PaginatedResponse<WorkflowInstance>, ApiError>({
    queryKey: queryKeys.workflowInstances(params),
    queryFn: () => apiGet<PaginatedResponse<WorkflowInstance>>('/workflows/instances', { params }),
    ...options,
  });
}

export function useCreateWorkflowMutation(
  options?: UseMutationOptions<WorkflowDefinition, ApiError, Record<string, unknown>>,
) {
  const qc = useQueryClient();
  return useMutation<WorkflowDefinition, ApiError, Record<string, unknown>>({
    mutationFn: (input) => apiPost<WorkflowDefinition>('/workflows', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.workflows() }),
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Search (spec §9.10)
// ---------------------------------------------------------------------------

export function useSearchQuery(
  query: string,
  params: { limit?: number; filters?: Record<string, unknown> } = {},
  options?: Omit<UseQueryOptions<{ items: SearchHit[]; total: number }, ApiError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<{ items: SearchHit[]; total: number }, ApiError>({
    queryKey: queryKeys.search(query, params),
    queryFn: () =>
      apiGet<{ items: SearchHit[]; total: number }>('/search', {
        params: { q: query, limit: params.limit ?? 25, ...params.filters },
      }),
    enabled: query.length > 0,
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Admin (spec §9.15)
// ---------------------------------------------------------------------------

export function useAdminDashboardQuery(
  options?: Omit<UseQueryOptions<Record<string, unknown>, ApiError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<Record<string, unknown>, ApiError>({
    queryKey: queryKeys.adminDashboard(),
    queryFn: () => apiGet<Record<string, unknown>>('/admin/dashboard'),
    ...options,
  });
}

// ---------------------------------------------------------------------------
// §9.1 IAM — Sessions, MFA, Password management
// ---------------------------------------------------------------------------

export function useSessionsQuery(
  options?: Omit<UseQueryOptions<unknown[], ApiError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<unknown[], ApiError>({
    queryKey: ['sessions'],
    queryFn: () => apiGet<unknown[]>('/auth/sessions'),
    ...options,
  });
}

export function useRevokeSessionMutation(
  options?: UseMutationOptions<{ ok: true }, ApiError, string>,
) {
  const qc = useQueryClient();
  return useMutation<{ ok: true }, ApiError, string>({
    mutationFn: (sessionId) => apiDelete<{ ok: true }>(`/auth/sessions/${sessionId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
    ...options,
  });
}

export function useRevokeAllSessionsMutation(
  options?: UseMutationOptions<{ count: number }, ApiError, void>,
) {
  const qc = useQueryClient();
  return useMutation<{ count: number }, ApiError, void>({
    mutationFn: () => apiPost<{ count: number }>('/auth/sessions/revoke-all', {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
    ...options,
  });
}

export function useChangePasswordMutation(
  options?: UseMutationOptions<{ ok: true }, ApiError, { currentPassword: string; newPassword: string }>,
) {
  return useMutation<{ ok: true }, ApiError, { currentPassword: string; newPassword: string }>({
    mutationFn: (input) => apiPost<{ ok: true }>('/auth/password/change', input),
    ...options,
  });
}

export function useStartMfaEnrollmentMutation(
  options?: UseMutationOptions<{ secret: string; qrCodeUri: string; backupCodes: string[] }, ApiError, void>,
) {
  return useMutation<{ secret: string; qrCodeUri: string; backupCodes: string[] }, ApiError, void>({
    mutationFn: () => apiPost<{ secret: string; qrCodeUri: string; backupCodes: string[] }>('/auth/mfa/enroll/start', {}),
    ...options,
  });
}

export function useConfirmMfaEnrollmentMutation(
  options?: UseMutationOptions<{ ok: true }, ApiError, { code: string }>,
) {
  const qc = useQueryClient();
  return useMutation<{ ok: true }, ApiError, { code: string }>({
    mutationFn: (input) => apiPost<{ ok: true }>('/auth/mfa/enroll/confirm', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.me() }),
    ...options,
  });
}

export function useDisableMfaMutation(
  options?: UseMutationOptions<{ ok: true }, ApiError, { currentPassword: string }>,
) {
  const qc = useQueryClient();
  return useMutation<{ ok: true }, ApiError, { currentPassword: string }>({
    mutationFn: (input) => apiPost<{ ok: true }>('/auth/mfa/disable', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.me() }),
    ...options,
  });
}

// ---------------------------------------------------------------------------
// §9.13 Notification preferences
// ---------------------------------------------------------------------------

export function useNotificationPreferencesQuery(
  options?: Omit<UseQueryOptions<Record<string, unknown>, ApiError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<Record<string, unknown>, ApiError>({
    queryKey: ['notification-preferences'],
    queryFn: () => apiGet<Record<string, unknown>>('/notifications/preferences'),
    ...options,
  });
}

export function useUpdateNotificationPreferencesMutation(
  options?: UseMutationOptions<Record<string, unknown>, ApiError, Record<string, unknown>>,
) {
  const qc = useQueryClient();
  return useMutation<Record<string, unknown>, ApiError, Record<string, unknown>>({
    mutationFn: (input) => apiPatch<Record<string, unknown>>('/notifications/preferences', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notification-preferences'] }),
    ...options,
  });
}

// ---------------------------------------------------------------------------
// §9.3 Document detail — versions, comments, tags, metadata, share, lock
// ---------------------------------------------------------------------------

export function useFoldersQuery(
  parentId?: string,
  options?: Omit<UseQueryOptions<unknown[], ApiError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<unknown[], ApiError>({
    queryKey: ['folders', parentId ?? 'root'],
    queryFn: () => apiGet<unknown[]>('/documents/folders', { params: { parentId } }),
    ...options,
  });
}

export function useDocumentVersionsQuery(
  documentId: string | undefined,
  options?: Omit<UseQueryOptions<unknown[], ApiError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<unknown[], ApiError>({
    queryKey: documentId ? ['document', documentId, 'versions'] : ['document', 'undefined', 'versions'],
    queryFn: () => apiGet<unknown[]>(`/documents/${documentId}/versions`),
    enabled: !!documentId,
    ...options,
  });
}

export function useDocumentCommentsQuery(
  documentId: string | undefined,
  options?: Omit<UseQueryOptions<unknown[], ApiError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<unknown[], ApiError>({
    queryKey: documentId ? ['document', documentId, 'comments'] : ['document', 'undefined', 'comments'],
    queryFn: () => apiGet<unknown[]>(`/documents/${documentId}/comments`),
    enabled: !!documentId,
    ...options,
  });
}

export function useCreateCommentMutation(
  documentId: string,
  options?: UseMutationOptions<unknown, ApiError, { body: string; anchor?: string }>,
) {
  const qc = useQueryClient();
  return useMutation<unknown, ApiError, { body: string; anchor?: string }>({
    mutationFn: (input) => apiPost<unknown>(`/documents/${documentId}/comments`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['document', documentId, 'comments'] }),
    ...options,
  });
}

export function useDocumentTagsQuery(
  documentId: string | undefined,
  options?: Omit<UseQueryOptions<{ tags: string[] }, ApiError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<{ tags: string[] }, ApiError>({
    queryKey: documentId ? ['document', documentId, 'tags'] : ['document', 'undefined', 'tags'],
    queryFn: () => apiGet<{ tags: string[] }>(`/documents/${documentId}/tags`),
    enabled: !!documentId,
    ...options,
  });
}

export function useAddTagMutation(
  documentId: string,
  options?: UseMutationOptions<{ tags: string[] }, ApiError, string>,
) {
  const qc = useQueryClient();
  return useMutation<{ tags: string[] }, ApiError, string>({
    mutationFn: (tag) => apiPost<{ tags: string[] }>(`/documents/${documentId}/tags`, { tag }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['document', documentId, 'tags'] }),
    ...options,
  });
}

export function useLockDocumentMutation(
  documentId: string,
  options?: UseMutationOptions<unknown, ApiError, void>,
) {
  const qc = useQueryClient();
  return useMutation<unknown, ApiError, void>({
    mutationFn: () => apiPost<unknown>(`/documents/${documentId}/lock`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.document(documentId) }),
    ...options,
  });
}

export function useUnlockDocumentMutation(
  documentId: string,
  options?: UseMutationOptions<unknown, ApiError, void>,
) {
  const qc = useQueryClient();
  return useMutation<unknown, ApiError, void>({
    mutationFn: () => apiPost<unknown>(`/documents/${documentId}/unlock`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.document(documentId) }),
    ...options,
  });
}

export function useRestoreVersionMutation(
  documentId: string,
  options?: UseMutationOptions<unknown, ApiError, { versionId: string; reason: string }>,
) {
  const qc = useQueryClient();
  return useMutation<unknown, ApiError, { versionId: string; reason: string }>({
    mutationFn: (input) =>
      apiPost<unknown>(`/documents/${documentId}/versions/${input.versionId}/restore`, { reason: input.reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.document(documentId) });
      qc.invalidateQueries({ queryKey: ['document', documentId, 'versions'] });
    },
    ...options,
  });
}

export function useDeclareRecordMutation(
  documentId: string,
  options?: UseMutationOptions<unknown, ApiError, { reason: string }>,
) {
  const qc = useQueryClient();
  return useMutation<unknown, ApiError, { reason: string }>({
    mutationFn: (input) => apiPost<unknown>(`/documents/${documentId}/declare-record`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.document(documentId) }),
    ...options,
  });
}

// ---------------------------------------------------------------------------
// §9.16 OCR / OMR / ICR / Barcode / Human Verification
// ---------------------------------------------------------------------------

export function useRunOcrMutation(
  options?: UseMutationOptions<unknown, ApiError, { documentId: string; versionId: string; language?: string; pages?: number[] }>,
) {
  return useMutation<unknown, ApiError, { documentId: string; versionId: string; language?: string; pages?: number[] }>({
    mutationFn: (input) => apiPost('/ocr/run', input),
    ...options,
  });
}

export function useRunOmrMutation(
  options?: UseMutationOptions<unknown, ApiError, { documentId: string; versionId: string; fieldDefinitions?: unknown[] }>,
) {
  return useMutation<unknown, ApiError, { documentId: string; versionId: string; fieldDefinitions?: unknown[] }>({
    mutationFn: (input) => apiPost('/omr/run', input),
    ...options,
  });
}

export function useRunIcrMutation(
  options?: UseMutationOptions<unknown, ApiError, { documentId: string; versionId: string; fieldDefinitions?: unknown[] }>,
) {
  return useMutation<unknown, ApiError, { documentId: string; versionId: string; fieldDefinitions?: unknown[] }>({
    mutationFn: (input) => apiPost('/icr/run', input),
    ...options,
  });
}

export function useDetectBarcodesMutation(
  options?: UseMutationOptions<unknown, ApiError, { documentId: string; versionId: string }>,
) {
  return useMutation<unknown, ApiError, { documentId: string; versionId: string }>({
    mutationFn: (input) => apiPost('/barcode/detect', input),
    ...options,
  });
}

export function useVerificationQueueQuery(
  params: { type?: 'ocr' | 'omr' | 'icr'; limit?: number } = {},
  options?: Omit<UseQueryOptions<unknown[], ApiError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<unknown[], ApiError>({
    queryKey: ['verification-queue', params],
    queryFn: () => apiGet<unknown[]>('/human-verification', { params }),
    ...options,
  });
}

export function useVerificationStatsQuery(
  options?: Omit<UseQueryOptions<unknown, ApiError>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<unknown, ApiError>({
    queryKey: ['verification-stats'],
    queryFn: () => apiGet('/human-verification/stats'),
    staleTime: 30_000,
    ...options,
  });
}

export function useApproveVerificationMutation(
  options?: UseMutationOptions<{ ok: true }, ApiError, string>,
) {
  const qc = useQueryClient();
  return useMutation<{ ok: true }, ApiError, string>({
    mutationFn: (id) => apiPost<{ ok: true }>(`/human-verification/${id}/approve`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['verification-queue'] });
      qc.invalidateQueries({ queryKey: ['verification-stats'] });
    },
    ...options,
  });
}

export function useCorrectVerificationMutation(
  options?: UseMutationOptions<{ ok: true }, ApiError, { id: string; correctedValue: string }>,
) {
  const qc = useQueryClient();
  return useMutation<{ ok: true }, ApiError, { id: string; correctedValue: string }>({
    mutationFn: (input) => apiPost<{ ok: true }>(`/human-verification/${input.id}/correct`, { correctedValue: input.correctedValue }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['verification-queue'] });
      qc.invalidateQueries({ queryKey: ['verification-stats'] });
    },
    ...options,
  });
}

export function useRejectVerificationMutation(
  options?: UseMutationOptions<{ ok: true }, ApiError, { id: string; reason: string }>,
) {
  const qc = useQueryClient();
  return useMutation<{ ok: true }, ApiError, { id: string; reason: string }>({
    mutationFn: (input) => apiPost<{ ok: true }>(`/human-verification/${input.id}/reject`, { reason: input.reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['verification-queue'] });
      qc.invalidateQueries({ queryKey: ['verification-stats'] });
    },
    ...options,
  });
}

// Re-export the error helper for convenience.
export { toApiError };
