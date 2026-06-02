"use client";

import { Button } from "@/components/ui/Button";
import { DownloadIcon, XIcon } from "@/components/chat/icons";
import { MarkdownMessage } from "@/components/chat/MarkdownMessage";
import type { DeepResearchCardState } from "@/types/deep-research";
import styles from "./deep-research.module.css";

interface ResearchCanvasProps {
  research: DeepResearchCardState;
  onClose: () => void;
  onExportPdf: (sessionId: string) => void;
}

export function ResearchCanvas({ research, onClose, onExportPdf }: ResearchCanvasProps) {
  const report = research.report;
  const citations = report?.citationMap ? Object.entries(report.citationMap) : [];

  return (
    <div className={styles.canvasBackdrop} role="dialog" aria-modal="true" aria-label="Deep Research report">
      <article className={styles.canvas}>
        <header className={styles.canvasHeader}>
          <div>
            <div className={styles.eyebrow}>Deep Research Report</div>
            <h2 className={styles.canvasTitle}>{report?.title || research.title}</h2>
            <p className={styles.subtitle}>
              {report ? `${report.sourceCount} sources · ${report.citationCount} citations` : "Report loading"}
            </p>
          </div>
          <div className={styles.canvasActions}>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<DownloadIcon size={14} />}
              disabled={!report || research.isExporting}
              onClick={() => onExportPdf(research.sessionId)}
            >
              {research.isExporting ? "Exporting..." : "Export PDF"}
            </Button>
            <Button variant="ghost" size="sm" leftIcon={<XIcon size={14} />} onClick={onClose}>
              Close
            </Button>
          </div>
        </header>
        <div className={styles.canvasBody}>
          <div className={styles.canvasGrid}>
            <div className={styles.reportProse}>
              {report ? (
                <MarkdownMessage content={report.contentMarkdown} />
              ) : (
                <p className={styles.emptyReport}>Loading the completed report...</p>
              )}
            </div>
            <aside className={styles.sourcesPanel} aria-label="Report sources">
              <h3 className={styles.sourcesTitle}>Sources</h3>
              {citations.length > 0 ? (
                citations.map(([index, citation]) => (
                  <div key={index} className={styles.citation}>
                    <span className={styles.citationIndex}>[{index}]</span>
                    <span>
                      {citation.url ? (
                        <a
                          className={styles.sourceLink}
                          href={citation.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <span className={styles.citationTitle}>{citation.title || citation.url}</span>
                        </a>
                      ) : (
                        <span className={styles.citationTitle}>{citation.title || "Source"}</span>
                      )}
                      {citation.domain && <span className={styles.citationDomain}>{citation.domain}</span>}
                    </span>
                  </div>
                ))
              ) : (
                <p className={styles.emptyReport}>Sources will appear when the report is available.</p>
              )}
            </aside>
          </div>
        </div>
      </article>
    </div>
  );
}

