"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "@/lib/api/errors";
import {
  cancelResearchSession,
  createResearchSession,
  exportResearchPdf,
  getResearchReport,
  getResearchSession,
  openResearchPdfExport,
  startResearchSession,
  streamResearchEvents,
} from "@/lib/api/deepResearch";
import type { ChatMessage } from "@/types/chat";
import type {
  DeepResearchCardState,
  DeepResearchEvent,
  DeepResearchProgressEvent,
  DeepResearchSource,
  DeepResearchSourceEvent,
} from "@/types/deep-research";

function createLocalId(prefix: string): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${prefix}-${random}`;
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

function statusText(step?: string | null): string {
  switch (step) {
    case "searching":
      return "Searching sources...";
    case "ranking_sources":
      return "Selecting the best sources...";
    case "reading_sources":
      return "Reading sources...";
    case "extracting":
      return "Extracting evidence...";
    case "embedding":
      return "Creating embeddings...";
    case "analyzing":
      return "Analyzing evidence...";
    case "writing_report":
      return "Writing report...";
    case "completed":
      return "Research completed";
    default:
      return "Preparing research...";
  }
}

interface UseDeepResearchOptions {
  workspaceId: string | null;
  chatId: string | null;
  onActivity?: () => void;
}

export interface UseDeepResearchResult {
  messages: ChatMessage[];
  isDeepResearchMode: boolean;
  setDeepResearchMode: (enabled: boolean) => void;
  isBusy: boolean;
  error: string | null;
  submitResearchQuery: (query: string) => Promise<void>;
  startResearch: (sessionId: string) => Promise<void>;
  cancelResearch: (sessionId: string) => Promise<void>;
  expandResearch: (sessionId: string) => Promise<void>;
  closeCanvas: () => void;
  exportPdf: (sessionId: string) => Promise<void>;
  expandedSessionId: string | null;
  expandedResearch: DeepResearchCardState | null;
  reset: () => void;
}

export function useDeepResearch({
  workspaceId,
  chatId,
  onActivity,
}: UseDeepResearchOptions): UseDeepResearchResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isDeepResearchMode, setDeepResearchMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const updateResearch = useCallback(
    (sessionId: string, updater: (state: DeepResearchCardState) => DeepResearchCardState) => {
      setMessages((prev) =>
        prev.map((message) => {
          if (message.research?.sessionId !== sessionId) return message;
          const research = updater(message.research);
          return { ...message, research, content: research.title };
        })
      );
    },
    []
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setDeepResearchMode(false);
    setError(null);
    setExpandedSessionId(null);
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  const submitResearchQuery = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) return;
      if (!workspaceId) {
        setError("Select or create a workspace before starting Deep Research.");
        return;
      }

      setError(null);
      const userMessage: ChatMessage = {
        id: createLocalId("research-user"),
        role: "user",
        content: trimmed,
        timestamp: Date.now(),
      };
      const pendingId = createLocalId("research-pending");
      const pendingResearch: DeepResearchCardState = {
        id: pendingId,
        sessionId: pendingId,
        query: trimmed,
        title: "Creating research plan",
        status: "DRAFT",
        objectives: [],
        searchQueries: [],
        steps: [],
        sources: [],
        sourceCount: 0,
        chunkCount: 0,
        progressPercent: 3,
        currentStep: "planning",
        isCreating: true,
        createdAt: Date.now(),
      };
      const pendingMessage: ChatMessage = {
        id: pendingId,
        role: "assistant",
        kind: "deep_research",
        content: pendingResearch.title,
        timestamp: Date.now() + 1,
        research: pendingResearch,
      };

      setMessages((prev) => [...prev, userMessage, pendingMessage]);

      try {
        const plan = await createResearchSession({
          workspaceId,
          chatId: chatId ?? undefined,
          query: trimmed,
        });
        const research: DeepResearchCardState = {
          id: pendingId,
          sessionId: plan.sessionId,
          query: plan.query,
          title: plan.title,
          status: plan.status,
          objectives: plan.objectives,
          searchQueries: plan.searchQueries,
          steps: plan.steps,
          sources: [],
          sourceCount: 0,
          chunkCount: 0,
          progressPercent: 5,
          currentStep: "planning",
          createdAt: plan.createdAt || Date.now(),
        };
        setMessages((prev) =>
          prev.map((message) =>
            message.id === pendingId
              ? { ...message, content: research.title, research }
              : message
          )
        );
        setDeepResearchMode(false);
        onActivity?.();
      } catch (err) {
        const message = errorMessage(err, "Could not create the research plan.");
        setError(message);
        updateResearch(pendingId, (state) => ({
          ...state,
          status: "FAILED",
          error: message,
          isCreating: false,
        }));
      }
    },
    [chatId, onActivity, updateResearch, workspaceId]
  );

  const handleStreamEvent = useCallback(
    (sessionId: string, event: DeepResearchEvent) => {
      if (event.type === "source_found" || event.type === "source_read") {
        const sourceEvent = event.data as DeepResearchSourceEvent;
        if (!sourceEvent.url) return;
        updateResearch(sessionId, (state) => {
          const id = sourceEvent.id || sourceEvent.url || createLocalId("source");
          const nextSource: DeepResearchSource = {
            id,
            title: sourceEvent.title || sourceEvent.url || "Source",
            url: sourceEvent.url || "",
            domain: sourceEvent.domain ?? null,
            status: sourceEvent.status || "DISCOVERED",
          };
          const sources = state.sources.some((source) => source.id === id || source.url === nextSource.url)
            ? state.sources.map((source) =>
                source.id === id || source.url === nextSource.url ? { ...source, ...nextSource } : source
              )
            : [...state.sources, nextSource];
          return {
            ...state,
            sources,
            sourceCount: Math.max(state.sourceCount, sources.length),
          };
        });
        return;
      }

      const progress = event.data as DeepResearchProgressEvent;
      updateResearch(sessionId, (state) => ({
        ...state,
        status: progress.status ?? state.status,
        progressPercent: progress.progressPercent ?? state.progressPercent,
        currentStep: progress.currentStep ?? state.currentStep,
        sourceCount: progress.sourceCount ?? state.sourceCount,
        chunkCount: progress.chunkCount ?? state.chunkCount,
        steps: progress.steps && progress.steps.length > 0 ? progress.steps : state.steps,
        sources: progress.sources && progress.sources.length > 0 ? progress.sources : state.sources,
        isStreaming:
          progress.status === "RUNNING" ||
          (progress.status === undefined && state.status === "RUNNING"),
        error:
          progress.status === "FAILED"
            ? progress.message || "Deep Research failed safely."
            : state.error,
        completedAt: progress.status === "COMPLETED" ? Date.now() : state.completedAt,
      }));
    },
    [updateResearch]
  );

  const loadReport = useCallback(
    async (sessionId: string) => {
      try {
        const report = await getResearchReport(sessionId);
        updateResearch(sessionId, (state) => ({
          ...state,
          report,
          title: report.title || state.title,
          status: "COMPLETED",
          progressPercent: 100,
          currentStep: "completed",
          sourceCount: report.sourceCount,
          isStreaming: false,
        }));
      } catch (err) {
        updateResearch(sessionId, (state) => ({
          ...state,
          error: errorMessage(err, "Research completed, but the report is not ready yet."),
          isStreaming: false,
        }));
      }
    },
    [updateResearch]
  );

  const startResearch = useCallback(
    async (sessionId: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setError(null);
      updateResearch(sessionId, (state) => ({
        ...state,
        status: "RUNNING",
        isStarting: true,
        currentStep: "queued",
        progressPercent: Math.max(state.progressPercent, 10),
      }));
      try {
        await startResearchSession(sessionId);
        updateResearch(sessionId, (state) => ({
          ...state,
          isStarting: false,
          isStreaming: true,
          currentStep: state.currentStep || "searching",
        }));
        await streamResearchEvents(sessionId, {
          signal: controller.signal,
          onEvent: (event) => handleStreamEvent(sessionId, event),
          onError: (message) => {
            updateResearch(sessionId, (state) => ({ ...state, error: message }));
          },
        });
        await loadReport(sessionId);
        onActivity?.();
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const message = errorMessage(err, "Could not start Deep Research.");
        setError(message);
        updateResearch(sessionId, (state) => ({
          ...state,
          status: state.status === "RUNNING" ? "FAILED" : state.status,
          error: message,
          isStarting: false,
          isStreaming: false,
        }));
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [handleStreamEvent, loadReport, onActivity, updateResearch]
  );

  const cancelResearch = useCallback(
    async (sessionId: string) => {
      abortRef.current?.abort();
      updateResearch(sessionId, (state) => ({ ...state, isCancelling: true }));
      try {
        const result = await cancelResearchSession(sessionId);
        updateResearch(sessionId, (state) => ({
          ...state,
          status: result.status,
          currentStep: "cancelled",
          isCancelling: false,
          isStreaming: false,
        }));
      } catch (err) {
        const message = errorMessage(err, "Could not cancel Deep Research.");
        setError(message);
        updateResearch(sessionId, (state) => ({
          ...state,
          error: message,
          isCancelling: false,
        }));
      }
    },
    [updateResearch]
  );

  const expandResearch = useCallback(
    async (sessionId: string) => {
      setExpandedSessionId(sessionId);
      const target = messages.find((message) => message.research?.sessionId === sessionId)?.research;
      if (target?.report || target?.status !== "COMPLETED") return;
      await loadReport(sessionId);
    },
    [loadReport, messages]
  );

  const closeCanvas = useCallback(() => setExpandedSessionId(null), []);

  const exportPdf = useCallback(
    async (sessionId: string) => {
      updateResearch(sessionId, (state) => ({ ...state, isExporting: true, error: null }));
      try {
        const response = await exportResearchPdf(sessionId);
        if (!openResearchPdfExport(response)) {
          throw new Error("The backend did not return a downloadable PDF.");
        }
      } catch (err) {
        const message = errorMessage(err, "PDF export failed.");
        setError(message);
        updateResearch(sessionId, (state) => ({ ...state, error: message }));
      } finally {
        updateResearch(sessionId, (state) => ({ ...state, isExporting: false }));
      }
    },
    [updateResearch]
  );

  const expandedResearch = useMemo(
    () =>
      expandedSessionId
        ? messages.find((message) => message.research?.sessionId === expandedSessionId)?.research ?? null
        : null,
    [expandedSessionId, messages]
  );

  const isBusy = messages.some((message) => {
    const research = message.research;
    return Boolean(research?.isCreating || research?.isStarting || research?.isStreaming);
  });

  // Keep completed sessions fresh if the stream closed before the report fetch succeeded.
  useEffect(() => {
    const pendingCompleted = messages
      .map((message) => message.research)
      .find((research) => research?.status === "COMPLETED" && !research.report && !research.error);
    if (!pendingCompleted) return;
    void getResearchSession(pendingCompleted.sessionId).then((detail) => {
      if (detail.reportReady) void loadReport(pendingCompleted.sessionId);
    }).catch(() => undefined);
  }, [loadReport, messages]);

  return {
    messages,
    isDeepResearchMode,
    setDeepResearchMode,
    isBusy,
    error,
    submitResearchQuery,
    startResearch,
    cancelResearch,
    expandResearch,
    closeCanvas,
    exportPdf,
    expandedSessionId,
    expandedResearch,
    reset,
  };
}

export { statusText as deepResearchStatusText };
