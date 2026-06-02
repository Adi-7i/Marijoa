import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { InputBar } from "@/components/chat/InputBar";
import { ResearchCanvasCard } from "@/components/deep-research/ResearchCanvasCard";
import { ResearchPlanCard } from "@/components/deep-research/ResearchPlanCard";
import { ResearchProgressCard } from "@/components/deep-research/ResearchProgressCard";
import {
  buildResearchEventsUrl,
  createResearchSession,
  openResearchPdfExport,
} from "@/lib/api/deepResearch";
import { API_BASE_URL } from "@/lib/api/config";
import { clearTokens, setAccessToken } from "@/lib/auth/token-store";
import { parseDeepResearchEvent } from "@/lib/sse/deepResearchEvents";
import type { DeepResearchCardState, DeepResearchStep } from "@/types/deep-research";

const fetchMock = vi.fn();

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function baseResearch(overrides: Partial<DeepResearchCardState> = {}): DeepResearchCardState {
  const steps: DeepResearchStep[] = [
    {
      stepKey: "searching",
      title: "Search for authoritative sources",
      orderIndex: 1,
      status: "RUNNING",
      progressPercent: 15,
    },
    {
      stepKey: "writing_report",
      title: "Write cited report",
      orderIndex: 2,
      status: "PENDING",
      progressPercent: 90,
    },
  ];
  return {
    id: "research-card",
    sessionId: "session-1",
    query: "India geography overview",
    title: "Research: India geography overview",
    status: "PLANNED",
    objectives: ["Explain major physical regions", "Identify authoritative sources"],
    searchQueries: ["India geography official", "India rivers mountains"],
    steps,
    sources: [],
    sourceCount: 0,
    chunkCount: 0,
    progressPercent: 5,
    currentStep: "planning",
    createdAt: Date.parse("2026-06-02T00:00:00Z"),
    ...overrides,
  };
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  clearTokens();
});

describe("Deep Research input mode", () => {
  it("changes the composer placeholder when Deep Research mode is active", () => {
    render(
      <InputBar
        webSearchEnabled={true}
        onWebSearchToggle={() => undefined}
        deepResearchEnabled={true}
        onDeepResearchToggle={() => undefined}
        placeholder="Get a detailed report..."
      />
    );
    expect(screen.getByPlaceholderText("Get a detailed report...")).toBeInTheDocument();
  });
});

describe("ResearchPlanCard", () => {
  it("renders title, objectives, and planned search queries", () => {
    render(
      <ResearchPlanCard
        research={baseResearch()}
        onStart={() => undefined}
        onCancel={() => undefined}
      />
    );
    expect(screen.getByText(/Research: India geography overview/i)).toBeInTheDocument();
    expect(screen.getByText(/Explain major physical regions/i)).toBeInTheDocument();
    expect(screen.getByText(/India geography official/i)).toBeInTheDocument();
  });

  it("calls the start handler with the session id", async () => {
    const onStart = vi.fn();
    render(
      <ResearchPlanCard
        research={baseResearch()}
        onStart={onStart}
        onCancel={() => undefined}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /^start$/i }));
    expect(onStart).toHaveBeenCalledWith("session-1");
  });
});

describe("ResearchProgressCard", () => {
  it("renders progress percent, steps, and metrics", () => {
    render(
      <ResearchProgressCard
        research={baseResearch({
          status: "RUNNING",
          progressPercent: 65,
          currentStep: "embedding",
          sourceCount: 4,
          chunkCount: 18,
        })}
        onCancel={() => undefined}
      />
    );
    expect(screen.getByText(/65% complete/i)).toBeInTheDocument();
    expect(screen.getByText(/Creating embeddings/i)).toBeInTheDocument();
    expect(screen.getByText(/Search for authoritative sources/i)).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
  });
});

describe("ResearchCanvasCard", () => {
  it("renders completed state and actions", () => {
    render(
      <ResearchCanvasCard
        research={baseResearch({
          status: "COMPLETED",
          sourceCount: 2,
          report: {
            id: "report-1",
            sessionId: "session-1",
            title: "India Geography",
            summary: "A concise report summary.",
            contentMarkdown: "# India Geography",
            citationMap: {},
            sourceCount: 2,
            citationCount: 2,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        })}
        onExpand={() => undefined}
        onExportPdf={() => undefined}
      />
    );
    expect(screen.getByText(/Research completed/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /expand/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /export pdf/i })).toBeInTheDocument();
  });
});

describe("Deep Research API client", () => {
  it("builds the create-session request against the backend route", async () => {
    setAccessToken("token-1");
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        session_id: "session-1",
        status: "PLANNED",
        title: "Research title",
        query: "India geography",
        objectives: ["objective"],
        search_queries: ["query"],
        steps: [],
        created_at: "2026-06-02T00:00:00Z",
      })
    );
    await createResearchSession({ workspaceId: "workspace-1", chatId: "chat-1", query: "India geography" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API_BASE_URL}/deep-research/sessions`);
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer token-1");
    expect(JSON.parse(String(init.body))).toEqual({
      workspace_id: "workspace-1",
      chat_id: "chat-1",
      query: "India geography",
      mode: "standard",
    });
  });

  it("builds the SSE events URL", () => {
    expect(buildResearchEventsUrl("session-1")).toBe(
      `${API_BASE_URL}/deep-research/sessions/session-1/events`
    );
  });
});

describe("Deep Research SSE events", () => {
  it("parses research progress events", () => {
    const event = parseDeepResearchEvent(
      "research_status",
      JSON.stringify({
        session_id: "session-1",
        status: "RUNNING",
        progress_percent: 65,
        current_step: "embedding",
        source_count: 3,
      })
    );
    expect(event.data).toMatchObject({
      sessionId: "session-1",
      status: "RUNNING",
      progressPercent: 65,
      currentStep: "embedding",
      sourceCount: 3,
    });
  });

  it("parses research completed events", () => {
    const event = parseDeepResearchEvent(
      "research_completed",
      JSON.stringify({ session_id: "session-1", status: "COMPLETED", progress_percent: 100 })
    );
    expect(event.type).toBe("research_completed");
    expect(event.data).toMatchObject({ status: "COMPLETED", progressPercent: 100 });
  });
});

describe("Deep Research PDF export helper", () => {
  it("opens a backend download URL response", () => {
    const open = vi.fn();
    vi.stubGlobal("open", open);
    expect(openResearchPdfExport({ status: "ready", downloadUrl: "https://files.example/report.pdf" })).toBe(true);
    expect(open).toHaveBeenCalledWith("https://files.example/report.pdf", "_blank", "noopener,noreferrer");
  });
});

