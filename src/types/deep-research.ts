export type DeepResearchStatus =
  | "DRAFT"
  | "PLANNED"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type DeepResearchStepStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "SKIPPED";

export interface DeepResearchStep {
  id?: string;
  sessionId?: string;
  stepKey: string;
  title: string;
  description?: string | null;
  orderIndex: number;
  status: DeepResearchStepStatus;
  progressPercent?: number | null;
  createdAt?: number;
  updatedAt?: number;
  startedAt?: number | null;
  completedAt?: number | null;
}

export interface DeepResearchSource {
  id: string;
  title: string;
  url: string;
  domain?: string | null;
  snippet?: string | null;
  rank?: number | null;
  score?: number | null;
  status: string;
  fetchedAt?: number | null;
}

export interface DeepResearchSession {
  id: string;
  userId: string;
  organizationId?: string | null;
  workspaceId: string;
  chatId?: string | null;
  query: string;
  title?: string | null;
  mode: string;
  status: DeepResearchStatus;
  progressPercent: number;
  currentStep?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: number;
  updatedAt: number;
  startedAt?: number | null;
  completedAt?: number | null;
  failedAt?: number | null;
  cancelledAt?: number | null;
}

export interface DeepResearchPlanResponse {
  sessionId: string;
  status: DeepResearchStatus;
  title: string;
  query: string;
  objectives: string[];
  searchQueries: string[];
  steps: DeepResearchStep[];
  createdAt: number;
}

export interface DeepResearchSessionDetail {
  session: DeepResearchSession;
  steps: DeepResearchStep[];
  sources: DeepResearchSource[];
  sourceCount: number;
  chunkCount: number;
  reportReady: boolean;
}

export interface DeepResearchStartResponse {
  sessionId: string;
  status: DeepResearchStatus;
  jobId?: string | null;
}

export interface DeepResearchCancelResponse {
  sessionId: string;
  status: DeepResearchStatus;
}

export interface DeepResearchCitation {
  source_id?: string;
  title?: string;
  url?: string;
  domain?: string | null;
}

export interface DeepResearchReport {
  id: string;
  sessionId: string;
  title: string;
  summary?: string | null;
  contentMarkdown: string;
  citationMap: Record<string, DeepResearchCitation> | null;
  sourceCount: number;
  citationCount: number;
  pdfFileId?: string | null;
  pdfStatus?: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface DeepResearchPdfExportResponse {
  status: string;
  fileId?: string | null;
  downloadUrl?: string | null;
  filename?: string | null;
  contentBase64?: string | null;
}

export interface DeepResearchProgressEvent {
  sessionId?: string;
  status?: DeepResearchStatus;
  progressPercent?: number;
  currentStep?: string | null;
  sourceCount?: number;
  chunkCount?: number;
  evidenceCount?: number;
  reportReady?: boolean;
  steps?: DeepResearchStep[];
  sources?: DeepResearchSource[];
  message?: string;
}

export interface DeepResearchSourceEvent {
  id?: string;
  title?: string;
  url?: string;
  domain?: string | null;
  status?: string;
}

export interface DeepResearchEvent {
  type: string;
  data: DeepResearchProgressEvent | DeepResearchSourceEvent | Record<string, unknown>;
}

export interface DeepResearchCardState {
  id: string;
  sessionId: string;
  query: string;
  title: string;
  status: DeepResearchStatus;
  objectives: string[];
  searchQueries: string[];
  steps: DeepResearchStep[];
  sources: DeepResearchSource[];
  sourceCount: number;
  chunkCount: number;
  progressPercent: number;
  currentStep?: string | null;
  report?: DeepResearchReport | null;
  error?: string | null;
  isCreating?: boolean;
  isStarting?: boolean;
  isStreaming?: boolean;
  isCancelling?: boolean;
  isExporting?: boolean;
  createdAt: number;
  completedAt?: number | null;
}

