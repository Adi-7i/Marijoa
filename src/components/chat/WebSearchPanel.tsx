"use client";

/**
 * Compact, collapsible "Searched the web" panel — Claude-style.
 *
 * Collapsed (default after streaming ends): one tidy row with
 * "Searched the web · N sources" and a chevron.
 * Expanded: query line(s) plus a flat list of source rows
 * (index, title, domain, optional short snippet).
 *
 * Renders nothing when there is no evidence of a web search.
 *
 * Source data flows in via assistant message metadata after `done`, or via
 * the live `web_sources` SSE event during streaming.
 */

import { useEffect, useState } from "react";
import type { CitationSource } from "@/types/marijoa";
import styles from "./WebSearchPanel.module.css";

interface WebSearchPanelProps {
  sources?: CitationSource[];
  queries?: string[];
  /** While streaming we default-open the panel; once done, default-closed. */
  isStreaming?: boolean;
  /** Search has started but no sources have arrived yet. */
  isSearching?: boolean;
}

function deriveDomain(source: CitationSource): string {
  if (source.domain) return source.domain;
  try {
    const host = new URL(source.url).hostname;
    return host.startsWith("www.") ? host.slice(4) : host;
  } catch {
    return "";
  }
}

function GlobeIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14.5 14.5 0 0 1 0 18" />
      <path d="M12 3a14.5 14.5 0 0 0 0 18" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={open ? styles.chevronOpen : styles.chevron}
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function WebSearchPanel({
  sources,
  queries,
  isStreaming = false,
  isSearching = false,
}: WebSearchPanelProps) {
  const hasSources = Array.isArray(sources) && sources.length > 0;
  const hasQueries = Array.isArray(queries) && queries.length > 0;
  const showSearching = isSearching && !hasSources;

  // Default-expanded while the answer is still streaming or searching;
  // collapse on done unless the user manually toggled.
  const [userToggled, setUserToggled] = useState(false);
  const [open, setOpen] = useState<boolean>(isStreaming || isSearching);

  useEffect(() => {
    if (userToggled) return;
    setOpen(isStreaming || isSearching);
  }, [isStreaming, isSearching, userToggled]);

  if (!hasSources && !showSearching && !hasQueries) return null;

  const sourceCount = hasSources ? sources!.length : 0;
  const headerLabel = showSearching
    ? "Searching the web…"
    : sourceCount > 0
      ? `Searched the web · ${sourceCount} source${sourceCount === 1 ? "" : "s"}`
      : "Searched the web";

  return (
    <section className={styles.panel} aria-label="Web search evidence">
      <button
        type="button"
        className={styles.header}
        aria-expanded={open}
        aria-controls="web-search-panel-body"
        onClick={() => {
          setUserToggled(true);
          setOpen((prev) => !prev);
        }}
      >
        <span className={`${styles.headerIcon} ${showSearching ? styles.searchingPulse : ""}`}>
          <GlobeIcon />
        </span>
        <span className={styles.headerLabel}>{headerLabel}</span>
        <span className={styles.spacer} aria-hidden="true" />
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div id="web-search-panel-body" className={styles.body}>
          {hasQueries && (
            <div className={styles.queries} aria-label="Search queries">
              {queries!.map((q, i) => (
                <div key={`${i}-${q}`} className={styles.queryRow}>
                  <span className={styles.queryLabel}>Query</span>
                  <span className={styles.queryText}>{q}</span>
                </div>
              ))}
            </div>
          )}

          {hasSources && (
            <ul className={styles.sourceList}>
              {sources!.map((source) => {
                const domain = deriveDomain(source);
                return (
                  <li key={`${source.index}-${source.url}`} className={styles.sourceItem}>
                    <a
                      className={styles.sourceLink}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                    >
                      <span className={styles.sourceIndex} aria-hidden="true">
                        [{source.index}]
                      </span>
                      <span className={styles.sourceMain}>
                        <span className={styles.sourceTitle}>{source.title}</span>
                        {domain && <span className={styles.sourceDomain}>{domain}</span>}
                        {source.snippet && (
                          <span className={styles.sourceSnippet}>{source.snippet}</span>
                        )}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          )}

          {!hasSources && showSearching && (
            <p className={styles.searchingHint} role="status">
              Looking up fresh information…
            </p>
          )}
        </div>
      )}
    </section>
  );
}
