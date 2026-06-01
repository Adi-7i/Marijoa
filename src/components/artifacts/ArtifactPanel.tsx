import type { Artifact } from "@/types/marijoa";
import { BoxIcon } from "@/components/chat/icons";
import styles from "@/components/layout/panel.module.css";

interface ArtifactPanelProps {
  artifacts: Artifact[];
}

const TYPE_LABEL: Record<Artifact["type"], string> = {
  code: "Code",
  document: "Doc",
  chart: "Chart",
  table: "Table",
};

function formatDate(ts: number) {
  const diff = Date.now() - ts;
  const h = 60 * 60 * 1000;
  const d = 24 * h;
  if (diff < h) return "Just now";
  if (diff < d) return `${Math.round(diff / h)}h ago`;
  return `${Math.round(diff / d)}d ago`;
}

export function ArtifactPanel({ artifacts }: ArtifactPanelProps) {
  if (artifacts.length === 0) {
    return (
      <div className={styles.placeholderHero}>
        <div className={styles.placeholderIcon}>
          <BoxIcon size={18} />
        </div>
        <p className={styles.placeholderTitle}>No artifacts yet</p>
        <p className={styles.placeholderSub}>
          Generated code, documents, and charts will appear here as you chat.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>{artifacts.length} artifact{artifacts.length !== 1 ? "s" : ""}</span>
      </div>
      <div className={styles.placeholderList}>
        {artifacts.map((artifact) => (
          <div key={artifact.id} className={styles.artifactCard} role="article">
            <div className={styles.artifactCardTop}>
              <span className={styles.artifactCardType}>
                <BoxIcon size={11} />
              </span>
              <span className={styles.artifactCardTitle}>{artifact.title}</span>
            </div>
            <span className={styles.artifactCardMeta}>
              {TYPE_LABEL[artifact.type]} · {formatDate(artifact.createdAt)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
