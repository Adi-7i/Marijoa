"use client";

import type { Artifact } from "@/types/marijoa";
import { formatRelative, truncate } from "@/lib/format";
import { ArtifactTypeBadge } from "./ArtifactTypeBadge";
import styles from "./artifacts.module.css";

interface ArtifactCardProps {
  artifact: Artifact;
  onClick: (id: string) => void;
}

export function ArtifactCard({ artifact, onClick }: ArtifactCardProps) {
  const preview = truncate(artifact.content, 80);
  const time = formatRelative(artifact.updatedAt ?? artifact.createdAt);

  return (
    <button
      type="button"
      className={styles.card}
      onClick={() => onClick(artifact.id)}
      aria-label={`Open artifact: ${artifact.title}`}
    >
      <div className={styles.cardHeader}>
        <ArtifactTypeBadge type={artifact.type} />
        <span className={styles.cardTitle}>{artifact.title}</span>
      </div>
      {preview && <p className={styles.cardPreview}>{preview}</p>}
      <div className={styles.cardFooter}>
        <span className={styles.cardMeta}>{time}</span>
        {artifact.version && artifact.version > 1 && (
          <span className={styles.cardVersion}>v{artifact.version}</span>
        )}
      </div>
    </button>
  );
}
