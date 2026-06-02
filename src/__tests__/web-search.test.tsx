/**
 * Frontend tests for the polished Web Search UX.
 *
 * Covers:
 *   1. WebSearchPanel collapsed/expanded behaviour and safe link attributes.
 *   2. ChatToolsMenu opens, toggles web search, toggles Deep Research mode,
 *      and forwards upload clicks to the attach handler.
 *   3. adaptMessage extracts sources / web_search_used / search_queries.
 *   4. streamAIResponse forwards web_mode and dispatches SSE web events.
 *   5. No source file references SEARXNG_BASE_URL or a SearXNG domain — the
 *      backend must remain the only client of the search provider.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { WebSearchPanel } from "@/components/chat/WebSearchPanel";
import { ChatToolsMenu } from "@/components/chat/ChatToolsMenu";
import { adaptCitationSource, adaptMessage } from "@/lib/api/adapters";
import type { MessageRead } from "@/lib/api/types";

// ---------------------------------------------------------------------------
// WebSearchPanel
// ---------------------------------------------------------------------------

const SAMPLE_SOURCES = [
  {
    index: 1,
    title: "FastAPI release",
    url: "https://fastapi.tiangolo.com/release-notes/",
    snippet: "0.115 is out",
    domain: "fastapi.tiangolo.com",
  },
  {
    index: 2,
    title: "Reddit thread",
    url: "https://reddit.com/r/Python/comments/abc",
  },
];

describe("WebSearchPanel", () => {
  it("renders nothing when there is no search activity at all", () => {
    const { container } = render(<WebSearchPanel />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a compact 'Searched the web · N sources' header", () => {
    render(<WebSearchPanel sources={SAMPLE_SOURCES} />);
    expect(
      screen.getByRole("button", { name: /searched the web · 2 sources/i })
    ).toBeInTheDocument();
  });

  it("starts collapsed after streaming ends and expands on click", async () => {
    render(<WebSearchPanel sources={SAMPLE_SOURCES} isStreaming={false} />);

    // Collapsed: source list is not in the DOM.
    expect(screen.queryByText(/FastAPI release/i)).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: /searched the web/i })
    );

    expect(screen.getByText(/FastAPI release/i)).toBeInTheDocument();
    expect(screen.getByText(/Reddit thread/i)).toBeInTheDocument();
  });

  it("starts expanded while the answer is still streaming", () => {
    render(<WebSearchPanel sources={SAMPLE_SOURCES} isStreaming={true} />);
    // Source list visible immediately, no click needed.
    expect(screen.getByText(/FastAPI release/i)).toBeInTheDocument();
  });

  it("uses safe rel attributes for every source link", async () => {
    render(<WebSearchPanel sources={SAMPLE_SOURCES} isStreaming={true} />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    for (const link of links) {
      expect(link).toHaveAttribute("target", "_blank");
      const rel = (link.getAttribute("rel") ?? "").split(/\s+/);
      expect(rel).toEqual(expect.arrayContaining(["noopener", "noreferrer"]));
    }
  });

  it("shows a 'Searching the web…' header when searching with no sources yet", () => {
    render(<WebSearchPanel isSearching={true} />);
    expect(
      screen.getByRole("button", { name: /searching the web/i })
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// ChatToolsMenu
// ---------------------------------------------------------------------------

describe("ChatToolsMenu", () => {
  it("opens a menu when the trigger is clicked", async () => {
    render(
      <ChatToolsMenu webSearchEnabled={true} onToggleWebSearch={() => undefined} />
    );
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /open chat tools/i }));

    expect(screen.getByRole("menu", { name: /chat tools/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /upload files/i })).toBeInTheDocument();
    expect(
      screen.getByRole("menuitemcheckbox", { name: /web search/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitemcheckbox", { name: /deep research/i })
    ).toBeInTheDocument();
  });

  it("calls onToggleWebSearch with the inverted value", async () => {
    const onToggle = vi.fn();
    render(<ChatToolsMenu webSearchEnabled={true} onToggleWebSearch={onToggle} />);
    await userEvent.click(screen.getByRole("button", { name: /open chat tools/i }));
    await userEvent.click(
      screen.getByRole("menuitemcheckbox", { name: /web search/i })
    );
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it("forwards Upload files clicks to onAttach without submitting any form", async () => {
    const onAttach = vi.fn();
    render(
      <ChatToolsMenu
        webSearchEnabled={false}
        onToggleWebSearch={() => undefined}
        onAttach={onAttach}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /open chat tools/i }));
    await userEvent.click(screen.getByRole("menuitem", { name: /upload files/i }));
    expect(onAttach).toHaveBeenCalledTimes(1);
  });

  it("shows the workspace notice if Upload files is clicked with no attach handler", async () => {
    render(
      <ChatToolsMenu webSearchEnabled={false} onToggleWebSearch={() => undefined} />
    );
    await userEvent.click(screen.getByRole("button", { name: /open chat tools/i }));
    await userEvent.click(screen.getByRole("menuitem", { name: /upload files/i }));
    expect(
      screen.getByText(/select or create a workspace before uploading files/i)
    ).toBeInTheDocument();
  });

  it("calls onToggleDeepResearch with the inverted value", async () => {
    const onToggleDeepResearch = vi.fn();
    render(
      <ChatToolsMenu
        webSearchEnabled={true}
        onToggleWebSearch={() => undefined}
        deepResearchEnabled={false}
        onToggleDeepResearch={onToggleDeepResearch}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /open chat tools/i }));
    const deepResearch = screen.getByRole("menuitemcheckbox", { name: /deep research/i });
    await userEvent.click(deepResearch);
    expect(onToggleDeepResearch).toHaveBeenCalledWith(true);
  });

  it("shows the workspace notice if Deep Research is clicked with no handler", async () => {
    render(
      <ChatToolsMenu webSearchEnabled={true} onToggleWebSearch={() => undefined} />
    );
    await userEvent.click(screen.getByRole("button", { name: /open chat tools/i }));
    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: /deep research/i }));
    expect(screen.getByText(/select or create a workspace before starting deep research/i)).toBeInTheDocument();
  });

  it("does NOT render the legacy 'Web: Auto' external pill", () => {
    render(
      <ChatToolsMenu webSearchEnabled={true} onToggleWebSearch={() => undefined} />
    );
    expect(screen.queryByText(/^Web: Auto$/)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// adaptMessage — extracts web-search metadata including search_queries
// ---------------------------------------------------------------------------

describe("adaptMessage with web search metadata", () => {
  function baseMessage(overrides: Partial<MessageRead> = {}): MessageRead {
    return {
      id: "m1",
      chat_id: "c1",
      user_id: null,
      role: "assistant",
      content: "Answer.",
      model: "test",
      metadata_json: null,
      created_at: "2026-06-01T00:00:00Z",
      updated_at: "2026-06-01T00:00:00Z",
      ...overrides,
    };
  }

  it("extracts sources, search_queries and web_search_used", () => {
    const adapted = adaptMessage(
      baseMessage({
        metadata_json: {
          web_search_used: true,
          web_mode: "auto",
          search_queries: ["india current affairs", "today news"],
          sources: [
            {
              index: 1,
              title: "Doc",
              url: "https://example.com/a",
              snippet: "snippet",
              domain: "example.com",
            },
          ],
        },
      })
    );

    expect(adapted.webSearchUsed).toBe(true);
    expect(adapted.webMode).toBe("auto");
    expect(adapted.searchQueries).toEqual(["india current affairs", "today news"]);
    expect(adapted.sources).toHaveLength(1);
    expect(adapted.sources?.[0].domain).toBe("example.com");
  });

  it("returns undefined source/flag fields when metadata is absent", () => {
    const adapted = adaptMessage(baseMessage({ metadata_json: null }));
    expect(adapted.webSearchUsed).toBeUndefined();
    expect(adapted.webMode).toBeUndefined();
    expect(adapted.sources).toBeUndefined();
    expect(adapted.searchQueries).toBeUndefined();
  });

  it("ignores malformed source entries and non-string queries", () => {
    const adapted = adaptMessage(
      baseMessage({
        metadata_json: {
          sources: [
            { index: 1, title: "ok", url: "https://example.com/" },
            { title: "missing url" },
            { index: 2 },
            "not an object",
          ],
          search_queries: ["good query", 42, null, ""],
        },
      })
    );
    expect(adapted.sources).toHaveLength(1);
    expect(adapted.searchQueries).toEqual(["good query"]);
  });

  it("normalises an invalid web_mode value to undefined", () => {
    const adapted = adaptMessage(
      baseMessage({ metadata_json: { web_mode: "BOGUS" } })
    );
    expect(adapted.webMode).toBeUndefined();
  });
});

describe("adaptCitationSource", () => {
  it("returns null when title or url is missing", () => {
    expect(adaptCitationSource({ index: 1, title: "", url: "x" })).toBeNull();
    expect(adaptCitationSource({ index: 1, title: "x", url: "" })).toBeNull();
    expect(adaptCitationSource(null)).toBeNull();
  });

  it("returns a citation with optional fields normalised", () => {
    const c = adaptCitationSource({
      index: 3,
      title: "T",
      url: "https://example.com",
      snippet: "snip",
      domain: "example.com",
    });
    expect(c).toEqual({
      index: 3,
      title: "T",
      url: "https://example.com",
      snippet: "snip",
      domain: "example.com",
    });
  });
});

// ---------------------------------------------------------------------------
// SSE dispatch + AI client web_mode propagation
// ---------------------------------------------------------------------------

describe("streamAIResponse SSE handling", () => {
  function makeSSEResponse(events: Array<{ event: string; data: unknown }>): Response {
    const encoder = new TextEncoder();
    const lines = events
      .map((e) => `event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`)
      .join("");
    return new Response(encoder.encode(lines), {
      status: 200,
      headers: { "content-type": "text/event-stream" },
    });
  }

  const ORIGINAL_FETCH = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
  });

  it("dispatches web_search_start and web_sources, forwards web_mode", async () => {
    const { streamAIResponse } = await import("@/lib/api/ai");

    const fetchMock = vi.fn().mockResolvedValue(
      makeSSEResponse([
        { event: "start", data: { chat_id: "c1", user_message_id: "u1" } },
        { event: "web_search_start", data: { mode: "auto", queries: ["q1", "q2"] } },
        {
          event: "web_sources",
          data: {
            sources: [
              {
                index: 1,
                title: "Doc",
                url: "https://example.com/x",
                snippet: "s",
                domain: "example.com",
              },
            ],
          },
        },
        { event: "token", data: { content: "Hello" } },
        { event: "done", data: { chat_id: "c1", message_id: "m1", web_search_used: true } },
      ])
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const onWebSearchStart = vi.fn();
    const onWebSources = vi.fn();
    const onToken = vi.fn();
    const onDone = vi.fn();

    await streamAIResponse("c1", "hi", {
      webMode: "off",
      onWebSearchStart,
      onWebSources,
      onToken,
      onDone,
    });

    expect(onWebSearchStart).toHaveBeenCalledWith({
      mode: "auto",
      queries: ["q1", "q2"],
    });
    expect(onWebSources).toHaveBeenCalledTimes(1);
    expect(onWebSources.mock.calls[0][0].sources).toHaveLength(1);
    expect(onToken).toHaveBeenCalledWith("Hello");
    expect(onDone).toHaveBeenCalledWith({
      chatId: "c1",
      messageId: "m1",
      webSearchUsed: true,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body).toEqual({ content: "hi", web_mode: "off" });
  });
});

// ---------------------------------------------------------------------------
// Security invariant: no SearXNG URL/secret in any frontend source file.
// ---------------------------------------------------------------------------

describe("frontend never references SearXNG directly", () => {
  it("contains no SEARXNG_ or searxng domain string in src/", () => {
    const root = path.resolve(__dirname, "..");

    const offenders: string[] = [];
    const offendingNeedles = ["SEARXNG_", "searxng.", "/search?format=json"];

    function walk(dir: string) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === "node_modules" || entry.name === "__tests__") continue;
          walk(full);
        } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
          const contents = fs.readFileSync(full, "utf8");
          for (const needle of offendingNeedles) {
            if (contents.includes(needle)) {
              offenders.push(`${full}: ${needle}`);
            }
          }
        }
      }
    }

    walk(root);
    expect(offenders).toEqual([]);
  });
});
