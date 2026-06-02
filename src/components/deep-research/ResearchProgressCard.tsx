"use client";

import { Button } from "@/components/ui/Button";
import { ActivityIcon, CheckCircleIcon, ClockIcon, XIcon } from "@/components/chat/icons";
import { deepResearchStatusText } from "@/hooks/useDeepResearch";
import type { DeepResearchCardState, DeepResearchStep } from "@/types/deep-research";
import styles from "./deep-research.module.css";

interface ResearchProgressCardProps {
  research: DeepResearchCardState;
  onCancel: (sessionId: string) => void;
}

function stepClass(step: DeepResearchStep): string {
  if (step.status === "COMPLETED") return `${styles.step} ${styles.stepDone}`;
  if (step.status === "RUNNING") return `${styles.step} ${styles.stepRunning}`;
  if (step.status === "FAILED") return `${styles.step} ${styles.stepFailed}`;
  return styles.step;
}

function stepIcon(step: DeepResearchStep) {
  if (step.status === "COMPLETED") return <CheckCircleIcon size={13} />;
  if (step.status === "RUNNING") return <ActivityIcon size={13} />;
  return <ClockIcon size={13} />;
}

export function ResearchProgressCard({ research, onCancel }: ResearchProgressCardProps) {
  const percent = Math.max(0, Math.min(100, research.progressPercent || 0));
  const canCancel = research.status === "RUNNING" || research.status === "PLANNED";

  return (
    <div className={styles.researchShell}>
      <article className={styles.card} aria-label="Deep Research progress">
        <header className={styles.cardHeader}>
          <div>
            <div className={styles.eyebrow}>
              <ActivityIcon size={13} />
              Deep Research
            </div>
            <h2 className={styles.title}>{research.title}</h2>
            <p className={styles.subtitle}>{deepResearchStatusText(research.currentStep)}</p>
          </div>
          <span className={`${styles.statusPill} ${styles.statusRunning}`}>{research.status}</span>
        </header>

        <div className={styles.cardBody}>
          <div className={styles.progressTrack} aria-label={`Research progress ${percent}%`}>
            <div className={styles.progressFill} style={{ width: `${percent}%` }} />
          </div>
          <div className={styles.progressMeta}>
            <span>{percent}% complete</span>
            <span>{research.currentStep || "queued"}</span>
          </div>

          <div className={styles.metrics} aria-label="Research metrics">
            <span className={styles.metric}>
              <span className={styles.metricValue}>{research.sourceCount}</span>
              <span className={styles.metricLabel}>sources</span>
            </span>
            <span className={styles.metric}>
              <span className={styles.metricValue}>{research.chunkCount}</span>
              <span className={styles.metricLabel}>chunks</span>
            </span>
          </div>

          {research.steps.length > 0 && (
            <ul className={styles.stepList} aria-label="Research steps">
              {research.steps.map((step) => (
                <li key={step.stepKey} className={stepClass(step)}>
                  <span className={styles.stepDot}>{stepIcon(step)}</span>
                  <span className={styles.stepTitle}>{step.title}</span>
                  <span className={styles.stepState}>{step.status}</span>
                </li>
              ))}
            </ul>
          )}

          {research.sources.length > 0 && (
            <ul className={styles.sourceList} aria-label="Sources found">
              {research.sources.slice(0, 5).map((source) => (
                <li key={source.id} className={styles.sourceItem}>
                  <a className={styles.sourceLink} href={source.url} target="_blank" rel="noopener noreferrer">
                    {source.title}
                  </a>
                  {source.domain ? ` · ${source.domain}` : ""}
                </li>
              ))}
            </ul>
          )}

          {research.error && <div className={styles.error}>{research.error}</div>}
        </div>

        <footer className={styles.actions}>
          <Button
            variant="danger"
            size="sm"
            leftIcon={<XIcon size={14} />}
            disabled={!canCancel || research.isCancelling}
            onClick={() => onCancel(research.sessionId)}
          >
            {research.isCancelling ? "Cancelling..." : "Cancel"}
          </Button>
        </footer>
      </article>
    </div>
  );
}

