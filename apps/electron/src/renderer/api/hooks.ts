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
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';
import type {
  Document,
  PaginatedResponse,
  CursorPaginationParams,
  HealthCheck,
  TourDefinition,
  TourUserState,
  TourChecklistItem,
  AssistantSession,
  AssistantMessage,
  Citation,
  LicenseLocalState,
  User,
} from '@smart-edms/types';
import { apiGet, apiPost, apiPatch, apiDelete, toApiError } from './client';
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
  tourUserState: (tourId: string) => ['tour', tourId, 'userState'] as const,
  tourChecklist: (tourId: string) => ['tour', tourId, 'checklist'] as const,
  license: () => ['license'] as const,
  aiSession: (sessionId: string) => ['ai', 'session', sessionId] as const,
  aiMessages: (sessionId: string) => ['ai', 'messages', sessionId] as const,
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
      if (folderId) form.append('folderId', folderId);
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

/** Send a message to the assistant. Returns the assistant's reply. */
export function useSendAiMessageMutation(
  sessionId: string,
  options?: UseMutationOptions<
    { message: AssistantMessage; citations: Citation[] },
    ApiError,
    { content: string }
  >,
) {
  return useMutation<
    { message: AssistantMessage; citations: Citation[] },
    ApiError,
    { content: string }
  >({
    mutationFn: (input) =>
      apiPost(`/ai/assistant/sessions/${sessionId}/messages`, input),
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

// Re-export the error helper for convenience.
export { toApiError };
