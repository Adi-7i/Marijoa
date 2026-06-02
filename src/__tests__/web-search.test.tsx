/**
 * Frontend tests for the Web Search Access Layer.
 *
 * Covers:
 *   1. WebModeSelector renders Auto/Off/Search and emits the right value.
 *   2. SourceCitations renders cards with correct links and rel attributes.
 *   3. SSE dispatcher recognises web_search_start and web_sources events.
 *   4. adaptMessage extracts sources / web_search_used from metadata_json.
 *   5. The streamAIResponse body includes web_mode when supplied.
 *   6. No source file references SEARXNG_BASE_URL or a SearXNG domain — the
 *      backend must remain the only client of the search provider.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { WebModeSelector } from "@/components/chat/WebModeSelector";
import { SourceCitations } from "@/components/chat/SourceCitations";
import { adaptCitationSource, adaptMessage } from "@/lib/api/adapters";
import type { MessageRead } from "@/lib/api/types";

// ---------------------------------------------------------------------------
// WebModeSelector
// ---------------------------------------------------------------------------

describe("WebModeSelector", () => {
  it("renders the current mode label", () => {
    render(<WebModeSelector mode="auto" onChange={() => undefined} />);
    expect(screen.getByRole("button", { name: /web mode: auto/i })).toBeInTheDocument();
  });

  it("opens a menu listing Auto, Search, and Off", async () => {
    render(<WebModeSelector mode="auto" onChange={() => undefined} />);
    await userEvent.click(screen.getByRole("button", { name: /web mode/i }));

    const menu = await screen.findByRole("menu");
    const items = screen.getAllByRole("menuitemradio");
    expect(menu).toBeInTheDocument();
    expect(items).toHaveLength(3);
    expect(items[0].textContent).toMatch(/^Auto/);
    expect(items[1].textContent).toMatch(/^Search/);
    expect(items[2].textContent).toMatch(/^Off/);
  });

  it("calls onChange with the selected mode", async () => {
    const onChange = vi.fn();
    render(<WebModeSelector mode="auto" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: /web mode/i }));
    const items = screen.getAllByRole("menuitemradio");
    // items[1] is "Search"
    await userEvent.click(items[1]);
    expect(onChange).toHaveBeenCalledWith("search");
  });
});

// ---------------------------------------------------------------------------
// SourceCitations
// ---------------------------------------------------------------------------

describe("SourceCitations", () => {
  it("renders nothing when no sources are passed", () => {
    const { container } = render(<SourceCitations sources={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders one card per source with safe link attributes", () => {
    render(
      <SourceCitations
        sources={[
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
        ]}
      />
    );

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute("href", "https://fastapi.tiangolo.com/release-notes/");
    expect(links[0]).toHaveAttribute("target", "_blank");
    const rel = (links[0].getAttribute("rel") ?? "").split(/\s+/);
    expect(rel).toEqual(expect.arrayContaining(["noopener", "noreferrer"]));
    expect(screen.getByText(/FastAPI release/i)).toBeInTheDocument();
    expect(screen.getByText(/Reddit thread/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// adaptMessage — extracts web-search metadata
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

  it("extracts sources and web_search_used flag from metadata", () => {
    const adapted = adaptMessage(
      baseMessage({
        metadata_json: {
          web_search_used: true,
          web_mode: "auto",
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
    expect(adapted.sources).toHaveLength(1);
    expect(adapted.sources?.[0].index).toBe(1);
    expect(adapted.sources?.[0].domain).toBe("example.com");
  });

  it("returns undefined source/flag fields when metadata is absent", () => {
    const adapted = adaptMessage(baseMessage({ metadata_json: null }));
    expect(adapted.webSearchUsed).toBeUndefined();
    expect(adapted.webMode).toBeUndefined();
    expect(adapted.sources).toBeUndefined();
  });

  it("ignores malformed source entries", () => {
    const adapted = adaptMessage(
      baseMessage({
        metadata_json: {
          sources: [
            { index: 1, title: "ok", url: "https://example.com/" },
            { title: "missing url" }, // dropped
            { index: 2 }, // dropped
            "not an object",
          ],
        },
      })
    );
    expect(adapted.sources).toHaveLength(1);
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
  // Build an SSE-formatted byte stream for the mock fetch response.
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

  it("dispatches web_search_start and web_sources to handlers and forwards web_mode", async () => {
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
      webMode: "search",
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

    // web_mode reaches the backend body
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body).toEqual({ content: "hi", web_mode: "search" });
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
