import type {
  DeepResearchEvent,
  DeepResearchProgressEvent,
  DeepResearchSource,
  DeepResearchSourceEvent,
  DeepResearchStatus,
  DeepResearchStep,
  DeepResearchStepStatus,
} from "@/types/deep-research";

function safeJsonParse(text: string): Record<string, unknown> {
  if (!text) return {};
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

const SESSION_STATUSES: ReadonlySet<DeepResearchStatus> = new Set([
  "DRAFT",
  "PLANNED",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
]);

const STEP_STATUSES: ReadonlySet<DeepResearchStepStatus> = new Set([
  "PENDING",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "SKIPPED",
]);

function toNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function toStatus(value: unknown): DeepResearchStatus | undefined {
  return typeof value === "string" && SESSION_STATUSES.has(value as DeepResearchStatus)
    ? (value as DeepResearchStatus)
    : undefined;
}

function toStepStatus(value: unknown): DeepResearchStepStatus {
  return typeof value === "string" && STEP_STATUSES.has(value as DeepResearchStepStatus)
    ? (value as DeepResearchStepStatus)
    : "PENDING";
}

function adaptStep(raw: unknown): DeepResearchStep | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const stepKey = String(item.step_key ?? item.stepKey ?? "");
  const title = String(item.title ?? stepKey);
  if (!stepKey || !title) return null;
  return {
    id: typeof item.id === "string" ? item.id : undefined,
    sessionId: typeof item.session_id === "string" ? item.session_id : undefined,
    stepKey,
    title,
    description: typeof item.description === "string" ? item.description : null,
    orderIndex: toNumber(item.order_index ?? item.orderIndex) ?? 0,
    status: toStepStatus(item.status),
    progressPercent: toNumber(item.progress_percent ?? item.progressPercent) ?? null,
  };
}

function adaptSource(raw: unknown): DeepResearchSource | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const id = String(item.id ?? item.url ?? "");
  const title = String(item.title ?? item.url ?? "Source");
  const url = String(item.url ?? "");
  if (!id || !url) return null;
  return {
    id,
    title,
    url,
    domain: typeof item.domain === "string" ? item.domain : null,
    snippet: typeof item.snippet === "string" ? item.snippet : null,
    rank: toNumber(item.rank) ?? null,
    score: toNumber(item.score) ?? null,
    status: typeof item.status === "string" ? item.status : "DISCOVERED",
  };
}

export function parseDeepResearchEvent(eventName: string, dataText: string): DeepResearchEvent {
  const data = safeJsonParse(dataText);

  if (eventName === "source_found" || eventName === "source_read") {
    const source = adaptSource(data);
    return {
      type: eventName,
      data: {
        id: source?.id,
        title: source?.title ?? (typeof data.title === "string" ? data.title : undefined),
        url: source?.url ?? (typeof data.url === "string" ? data.url : undefined),
        domain: source?.domain ?? (typeof data.domain === "string" ? data.domain : null),
        status: source?.status ?? (typeof data.status === "string" ? data.status : undefined),
      } satisfies DeepResearchSourceEvent,
    };
  }

  const steps = Array.isArray(data.steps)
    ? data.steps.map(adaptStep).filter((step): step is DeepResearchStep => step !== null)
    : undefined;
  const sources = Array.isArray(data.sources)
    ? data.sources.map(adaptSource).filter((source): source is DeepResearchSource => source !== null)
    : undefined;

  const progress: DeepResearchProgressEvent = {
    sessionId: typeof data.session_id === "string" ? data.session_id : undefined,
    status: toStatus(data.status),
    progressPercent: toNumber(data.progress_percent),
    currentStep: typeof data.current_step === "string" ? data.current_step : null,
    sourceCount: toNumber(data.source_count),
    chunkCount: toNumber(data.chunk_count),
    evidenceCount: toNumber(data.evidence_count),
    reportReady: typeof data.report_ready === "boolean" ? data.report_ready : undefined,
    steps,
    sources,
    message: typeof data.message === "string" ? data.message : undefined,
  };

  return { type: eventName, data: progress };
}

