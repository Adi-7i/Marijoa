"use client";

import { Button } from "@/components/ui/Button";
import { CheckCircleIcon, PencilIcon, SearchIcon, XIcon, ZapIcon } from "@/components/chat/icons";
import type { DeepResearchCardState } from "@/types/deep-research";
import styles from "./deep-research.module.css";

interface ResearchPlanCardProps {
  research: DeepResearchCardState;
  onStart: (sessionId: string) => void;
  onCancel: (sessionId: string) => void;
}

export function ResearchPlanCard({ research, onStart, onCancel }: ResearchPlanCardProps) {
  const loading = Boolean(research.isCreating || research.isStarting || research.isCancelling);

  return (
    <div className={styles.researchShell}>
      <article className={styles.card} aria-label="Deep Research plan">
        <header className={styles.cardHeader}>
          <div>
            <div className={styles.eyebrow}>
              <SearchIcon size={13} />
              Deep Research Plan
            </div>
            <h2 className={styles.title}>{research.title}</h2>
            <p className={styles.subtitle}>{research.query}</p>
          </div>
          <span className={styles.statusPill}>{research.isCreating ? "Planning" : "Planned"}</span>
        </header>

        <div className={styles.cardBody}>
          <p className={styles.sectionLabel}>Objectives</p>
          {research.objectives.length > 0 ? (
            <ul className={styles.objectiveList}>
              {research.objectives.map((objective) => (
                <li key={objective} className={styles.objective}>
                  <span className={styles.checkDot}>
                    <CheckCircleIcon size={12} />
                  </span>
                  <span>{objective}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.summary}>Building the plan from your query...</p>
          )}

          {research.searchQueries.length > 0 && (
            <ul className={styles.queryList} aria-label="Planned search queries">
              {research.searchQueries.map((query) => (
                <li key={query} className={styles.queryChip}>{query}</li>
              ))}
            </ul>
          )}

          {research.error && <div className={styles.error}>{research.error}</div>}
          <div className={styles.notice}>
            Edit is unavailable in this backend version. Create a new plan with a revised prompt to change scope.
          </div>
        </div>

        <footer className={styles.actions}>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<PencilIcon size={14} />}
            disabled
            title="Plan editing is not supported by the current backend."
          >
            Edit
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<XIcon size={14} />}
            disabled={loading}
            onClick={() => onCancel(research.sessionId)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<ZapIcon size={14} />}
            disabled={loading || research.status !== "PLANNED"}
            onClick={() => onStart(research.sessionId)}
          >
            {research.isStarting ? "Starting..." : "Start"}
          </Button>
        </footer>
      </article>
    </div>
  );
}

