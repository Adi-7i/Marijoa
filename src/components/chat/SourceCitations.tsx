"use client";

import type { CitationSource } from "@/types/marijoa";
import styles from "./SourceCitations.module.css";

interface SourceCitationsProps {
  sources?: CitationSource[];
}

function deriveDomain(source: CitationSource): string | undefined {
  if (source.domain) return source.domain;
  try {
    const host = new URL(source.url).hostname;
    return host.startsWith("www.") ? host.slice(4) : host;
  } catch {
    return undefined;
  }
}

export function SourceCitations({ sources }: SourceCitationsProps) {
  if (!sources || sources.length === 0) return null;

  return (
    <aside className={styles.container} aria-label="Sources cited in this answer">
      <div className={styles.header}>
        <span className={styles.headerIcon} aria-hidden="true">
          {/* Inline globe SVG to avoid pulling in another icon dependency. */}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18" />
            <path d="M12 3a14.5 14.5 0 0 1 0 18" />
            <path d="M12 3a14.5 14.5 0 0 0 0 18" />
          </svg>
        </span>
        <span>Sources</span>
      </div>
      <div className={styles.grid}>
        {sources.map((source) => {
          const domain = deriveDomain(source);
          return (
            <a
              key={`${source.index}-${source.url}`}
              className={styles.card}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
            >
              <span className={styles.cardIndex} aria-hidden="true">
                {source.index}
              </span>
              <span className={styles.cardBody}>
                <span className={styles.cardTitle}>{source.title}</span>
                {domain && <span className={styles.cardDomain}>{domain}</span>}
                {source.snippet && (
                  <span className={styles.cardSnippet}>{source.snippet}</span>
                )}
              </span>
            </a>
          );
        })}
      </div>
    </aside>
  );
}
