"use client";

import { ApiError } from "./errors";
import { apiClient, buildApiUrl } from "./client";
import { clearTokens, getAccessToken } from "@/lib/auth/token-store";
import { readSSEStream, type SSEEvent } from "@/lib/sse/parse-sse";
import { parseDeepResearchEvent } from "@/lib/sse/deepResearchEvents";
import type {
  DeepResearchCancelResponse,
  DeepResearchEvent,
  DeepResearchPdfExportResponse,
  DeepResearchPlanResponse,
  DeepResearchReport,
  DeepResearchSession,
  DeepResearchSessionDetail,
  DeepResearchSource,
  DeepResearchStartResponse,
  DeepResearchStep,
} from "@/types/deep-research";

interface RawStep {
  id?: string;
  session_id?: string;
  step_key: string;
  title: string;
  description?: string | null;
  order_index: number;
  status: string;
  progress_percent?: number | null;
  created_at?: string;
  updated_at?: string;
  started_at?: string | null;
  completed_at?: string | null;
}

interface RawSource {
  id: string;
  title: string;
  url: string;
  domain?: string | null;
  snippet?: string | null;
  rank?: number | null;
  score?: number | null;
  status: string;
  fetched_at?: string | null;
}

interface RawSession {
  id: string;
  user_id: string;
  organization_id?: string | null;
  workspace_id: string;
  chat_id?: string | null;
  query: string;
  title?: string | null;
  mode: string;
  status: string;
  progress_percent: number;
  current_step?: string | null;
  error_message?: string | null;
  metadata_json?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  failed_at?: string | null;
  cancelled_at?: string | null;
}

interface RawPlanResponse {
  session_id: string;
  status: string;
  title: string;
  query: string;
  objectives: string[];
  search_queries: string[];
  steps: RawStep[];
  created_at: string;
}

interface RawSessionDetail {
  session: RawSession;
  steps: RawStep[];
  sources: RawSource[];
  source_count: number;
  chunk_count: number;
  report_ready: boolean;
}

interface RawStartResponse {
  session_id: string;
  status: string;
  job_id?: string | null;
}

interface RawCancelResponse {
  session_id: string;
  status: string;
}

interface RawReport {
  id: string;
  session_id: string;
  title: string;
  summary?: string | null;
  content_markdown: string;
  citation_map_json?: Record<string, unknown> | null;
  source_count: number;
  citation_count: number;
  pdf_file_id?: string | null;
  pdf_status?: string | null;
  created_at: string;
  updated_at: string;
}

interface RawPdfExport {
  status: string;
  file_id?: string | null;
  download_url?: string | null;
  filename?: string | null;
  content_base64?: string | null;
}

export interface CreateResearchSessionPayload {
  workspaceId: string;
  chatId?: string | null;
  query: string;
  mode?: string;
}

export interface StreamResearchHandlers {
  onEvent?: (event: DeepResearchEvent) => void;
  onError?: (message: string) => void;
  onDone?: () => void;
}

export interface StreamResearchOptions extends StreamResearchHandlers {
  signal?: AbortSignal;
}

function isoToMs(value: string | null | undefined): number {
  if (!value) return 0;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? 0 : ms;
}

function adaptStep(raw: RawStep): DeepResearchStep {
  return {
    id: raw.id,
    sessionId: raw.session_id,
    stepKey: raw.step_key,
    title: raw.title,
    description: raw.description ?? null,
    orderIndex: raw.order_index,
    status: raw.status as DeepResearchStep["status"],
    progressPercent: raw.progress_percent ?? null,
    createdAt: isoToMs(raw.created_at),
    updatedAt: isoToMs(raw.updated_at),
    startedAt: raw.started_at ? isoToMs(raw.started_at) : null,
    completedAt: raw.completed_at ? isoToMs(raw.completed_at) : null,
  };
}

function adaptSource(raw: RawSource): DeepResearchSource {
  return {
    id: raw.id,
    title: raw.title,
    url: raw.url,
    domain: raw.domain ?? null,
    snippet: raw.snippet ?? null,
    rank: raw.rank ?? null,
    score: raw.score ?? null,
    status: raw.status,
    fetchedAt: raw.fetched_at ? isoToMs(raw.fetched_at) : null,
  };
}

function adaptSession(raw: RawSession): DeepResearchSession {
  return {
    id: raw.id,
    userId: raw.user_id,
    organizationId: raw.organization_id ?? null,
    workspaceId: raw.workspace_id,
    chatId: raw.chat_id ?? null,
    query: raw.query,
    title: raw.title ?? null,
    mode: raw.mode,
    status: raw.status as DeepResearchSession["status"],
    progressPercent: raw.progress_percent,
    currentStep: raw.current_step ?? null,
    errorMessage: raw.error_message ?? null,
    metadata: raw.metadata_json ?? null,
    createdAt: isoToMs(raw.created_at),
    updatedAt: isoToMs(raw.updated_at),
    startedAt: raw.started_at ? isoToMs(raw.started_at) : null,
    completedAt: raw.completed_at ? isoToMs(raw.completed_at) : null,
    failedAt: raw.failed_at ? isoToMs(raw.failed_at) : null,
    cancelledAt: raw.cancelled_at ? isoToMs(raw.cancelled_at) : null,
  };
}

function adaptPlan(raw: RawPlanResponse): DeepResearchPlanResponse {
  return {
    sessionId: raw.session_id,
    status: raw.status as DeepResearchPlanResponse["status"],
    title: raw.title,
    query: raw.query,
    objectives: raw.objectives,
    searchQueries: raw.search_queries,
    steps: raw.steps.map(adaptStep),
    createdAt: isoToMs(raw.created_at),
  };
}

function adaptDetail(raw: RawSessionDetail): DeepResearchSessionDetail {
  return {
    session: adaptSession(raw.session),
    steps: raw.steps.map(adaptStep),
    sources: raw.sources.map(adaptSource),
    sourceCount: raw.source_count,
    chunkCount: raw.chunk_count,
    reportReady: raw.report_ready,
  };
}

function adaptReport(raw: RawReport): DeepResearchReport {
  return {
    id: raw.id,
    sessionId: raw.session_id,
    title: raw.title,
    summary: raw.summary ?? null,
    contentMarkdown: raw.content_markdown,
    citationMap: raw.citation_map_json as DeepResearchReport["citationMap"],
    sourceCount: raw.source_count,
    citationCount: raw.citation_count,
    pdfFileId: raw.pdf_file_id ?? null,
    pdfStatus: raw.pdf_status ?? null,
    createdAt: isoToMs(raw.created_at),
    updatedAt: isoToMs(raw.updated_at),
  };
}

function adaptPdf(raw: RawPdfExport): DeepResearchPdfExportResponse {
  return {
    status: raw.status,
    fileId: raw.file_id ?? null,
    downloadUrl: raw.download_url ?? null,
    filename: raw.filename ?? null,
    contentBase64: raw.content_base64 ?? null,
  };
}

export async function createResearchSession(
  payload: CreateResearchSessionPayload
): Promise<DeepResearchPlanResponse> {
  const raw = await apiClient.post<RawPlanResponse>("/deep-research/sessions", {
    json: {
      workspace_id: payload.workspaceId,
      chat_id: payload.chatId ?? undefined,
      query: payload.query,
      mode: payload.mode ?? "standard",
    },
  });
  return adaptPlan(raw);
}

export async function getResearchSession(sessionId: string): Promise<DeepResearchSessionDetail> {
  return adaptDetail(
    await apiClient.get<RawSessionDetail>(`/deep-research/sessions/${sessionId}`)
  );
}

export async function startResearchSession(sessionId: string): Promise<DeepResearchStartResponse> {
  const raw = await apiClient.post<RawStartResponse>(`/deep-research/sessions/${sessionId}/start`);
  return {
    sessionId: raw.session_id,
    status: raw.status as DeepResearchStartResponse["status"],
    jobId: raw.job_id ?? null,
  };
}

export async function cancelResearchSession(sessionId: string): Promise<DeepResearchCancelResponse> {
  const raw = await apiClient.post<RawCancelResponse>(`/deep-research/sessions/${sessionId}/cancel`);
  return {
    sessionId: raw.session_id,
    status: raw.status as DeepResearchCancelResponse["status"],
  };
}

export async function getResearchReport(sessionId: string): Promise<DeepResearchReport> {
  return adaptReport(
    await apiClient.get<RawReport>(`/deep-research/sessions/${sessionId}/report`)
  );
}

export async function exportResearchPdf(sessionId: string): Promise<DeepResearchPdfExportResponse> {
  return adaptPdf(
    await apiClient.post<RawPdfExport>(`/deep-research/sessions/${sessionId}/export/pdf`)
  );
}

export async function listWorkspaceResearchSessions(
  workspaceId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<DeepResearchSession[]> {
  const raw = await apiClient.get<RawSession[]>(`/deep-research/workspaces/${workspaceId}/sessions`, {
    query: { limit: options.limit, offset: options.offset },
  });
  return raw.map(adaptSession);
}

function dispatchEvent(event: SSEEvent, handlers: StreamResearchHandlers): boolean {
  const parsed = parseDeepResearchEvent(event.event, event.data);
  handlers.onEvent?.(parsed);
  return [
    "research_completed",
    "research_failed",
    "research_cancelled",
  ].includes(event.event);
}

export async function streamResearchEvents(
  sessionId: string,
  options: StreamResearchOptions = {}
): Promise<void> {
  const { signal, ...handlers } = options;
  const token = getAccessToken();
  const headers: Record<string, string> = { Accept: "text/event-stream" };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(buildApiUrl(`/deep-research/sessions/${sessionId}/events`), {
      method: "GET",
      headers,
      signal,
      credentials: "omit",
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError({
      status: 0,
      code: "NETWORK_ERROR",
      message: "Could not connect to the Deep Research stream.",
      isNetworkError: true,
    });
  }

  if (!response.ok) {
    if (response.status === 401) clearTokens();
    throw new ApiError({
      status: response.status,
      code: `HTTP_${response.status}`,
      message: response.statusText || "Deep Research stream failed.",
    });
  }

  let terminated = false;
  await readSSEStream(
    response,
    (event) => {
      if (terminated) return;
      try {
        terminated = dispatchEvent(event, handlers);
      } catch {
        handlers.onError?.("A Deep Research progress event could not be parsed.");
      }
    },
    { signal }
  );
  handlers.onDone?.();
}

export function buildResearchEventsUrl(sessionId: string): string {
  return buildApiUrl(`/deep-research/sessions/${sessionId}/events`);
}

export function openResearchPdfExport(response: DeepResearchPdfExportResponse): boolean {
  if (response.downloadUrl) {
    window.open(response.downloadUrl, "_blank", "noopener,noreferrer");
    return true;
  }
  if (response.contentBase64) {
    const byteCharacters = atob(response.contentBase64);
    const bytes = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i += 1) {
      bytes[i] = byteCharacters.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = response.filename || "deep-research.pdf";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  }
  return false;
}

