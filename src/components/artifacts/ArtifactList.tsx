"use client";

import { useMemo, useState } from "react";
import type { Artifact, ArtifactType } from "@/types/marijoa";
import { BoxIcon } from "@/components/chat/icons";
import { ArtifactCard } from "./ArtifactCard";
import styles from "./artifacts.module.css";

const ALL_FILTER = "all";

interface ArtifactListProps {
  artifacts: Artifact[];
  onSelect: (id: string) => void;
}

export function ArtifactList({ artifacts, onSelect }: ArtifactListProps) {
  const [filter, setFilter] = useState<ArtifactType | typeof ALL_FILTER>(ALL_FILTER);

  const availableTypes = useMemo(
    () => Array.from(new Set(artifacts.map((a) => a.type))).sort(),
    [artifacts]
  );

  const visible = useMemo(
    () => (filter === ALL_FILTER ? artifacts : artifacts.filter((a) => a.type === filter)),
    [artifacts, filter]
  );

  if (artifacts.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}><BoxIcon size={18} /></div>
        <p className={styles.emptyTitle}>No artifacts yet</p>
        <p className={styles.emptySub}>
          Save assistant responses as artifacts using the bookmark button on any message.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <span className={styles.countLabel}>
          {artifacts.length} artifact{artifacts.length !== 1 ? "s" : ""}
        </span>
      </div>

      {availableTypes.length > 1 && (
        <div className={styles.filterRow} role="group" aria-label="Filter by type">
          <button
            type="button"
            className={`${styles.filterChip} ${filter === ALL_FILTER ? styles.filterChipActive : ""}`}
            onClick={() => setFilter(ALL_FILTER)}
          >
            All
          </button>
          {availableTypes.map((t) => (
            <button
              key={t}
              type="button"
              className={`${styles.filterChip} ${filter === t ? styles.filterChipActive : ""}`}
              onClick={() => setFilter(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      )}

      <div className={styles.list}>
        {visible.length === 0 ? (
          <p style={{ fontSize: "12.5px", color: "var(--color-text-muted)", padding: "8px 0" }}>
            No artifacts of this type.
          </p>
        ) : (
          visible.map((artifact) => (
            <ArtifactCard key={artifact.id} artifact={artifact} onClick={onSelect} />
          ))
        )}
      </div>
    </div>
  );
}
