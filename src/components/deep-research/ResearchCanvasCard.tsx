"use client";

import { Button } from "@/components/ui/Button";
import { DownloadIcon, EyeIcon, FileTextIcon } from "@/components/chat/icons";
import type { DeepResearchCardState } from "@/types/deep-research";
import styles from "./deep-research.module.css";

interface ResearchCanvasCardProps {
  research: DeepResearchCardState;
  onExpand: (sessionId: string) => void;
  onExportPdf: (sessionId: string) => void;
}

export function ResearchCanvasCard({ research, onExpand, onExportPdf }: ResearchCanvasCardProps) {
  const report = research.report;
  const summary = report?.summary || "Research completed. Open the canvas to review the full report and sources.";

  return (
    <div className={styles.researchShell}>
      <article className={styles.card} aria-label="Deep Research completed report">
        <header className={styles.cardHeader}>
          <div>
            <div className={styles.eyebrow}>
              <FileTextIcon size={13} />
              Research Canvas
            </div>
            <h2 className={styles.title}>{report?.title || research.title}</h2>
            <p className={styles.subtitle}>
              Research completed · {report?.sourceCount ?? research.sourceCount} sources · {report?.citationCount ?? 0} citations
            </p>
          </div>
          <span className={`${styles.statusPill} ${styles.statusComplete}`}>Completed</span>
        </header>
        <div className={styles.cardBody}>
          <p className={styles.summary}>{summary}</p>
          {research.error && <div className={styles.error}>{research.error}</div>}
        </div>
        <footer className={styles.actions}>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<EyeIcon size={14} />}
            onClick={() => onExpand(research.sessionId)}
          >
            Expand
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<DownloadIcon size={14} />}
            disabled={research.isExporting}
            onClick={() => onExportPdf(research.sessionId)}
          >
            {research.isExporting ? "Exporting..." : "Export PDF"}
          </Button>
        </footer>
      </article>
    </div>
  );
}

