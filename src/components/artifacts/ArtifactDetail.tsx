"use client";

import { useCallback, useState } from "react";
import type { Artifact } from "@/types/marijoa";
import { ChevronIcon, CopyIcon, CheckIcon, PencilIcon, Trash2Icon } from "@/components/chat/icons";
import { formatRelative } from "@/lib/format";
import { ArtifactTypeBadge } from "./ArtifactTypeBadge";
import styles from "./artifacts.module.css";

interface ArtifactDetailProps {
  artifact: Artifact;
  onBack: () => void;
  onDelete: (id: string) => void;
}

export function ArtifactDetail({ artifact, onBack, onDelete }: ArtifactDetailProps) {
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState(artifact.content);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard?.writeText(artifact.content);
    } catch {
      // clipboard unavailable in some environments
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [artifact.content]);

  const handleSaveEdit = useCallback(() => {
    // Local-only edit — no backend call
    setEditMode(false);
  }, []);

  const isCode = artifact.type === "code";
  const time = formatRelative(artifact.updatedAt ?? artifact.createdAt);

  return (
    <div className={styles.detail}>
      <button type="button" className={styles.detailBack} onClick={onBack}>
        <ChevronIcon size={12} style={{ transform: "rotate(90deg)" }} />
        Back to list
      </button>

      <div className={styles.detailHeader}>
        <h2 className={styles.detailTitle}>{artifact.title}</h2>
      </div>

      <div className={styles.detailMeta}>
        <ArtifactTypeBadge type={artifact.type} />
        {artifact.version && (
          <span className={styles.detailMetaItem}>v{artifact.version}</span>
        )}
        <span className={styles.detailMetaItem}>·</span>
        <span className={styles.detailMetaItem}>{time}</span>
        {artifact.chatId && (
          <>
            <span className={styles.detailMetaItem}>·</span>
            <span className={styles.detailMetaItem}>From chat</span>
          </>
        )}
      </div>

      <div className={styles.detailContent}>
        {editMode ? (
          <>
            <textarea
              className={styles.editArea}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              aria-label="Edit artifact content"
            />
            <div className={styles.editActions}>
              <button
                type="button"
                className={`${styles.detailBtn} ${styles.detailBtnPrimary}`}
                onClick={handleSaveEdit}
              >
                Save
              </button>
              <button
                type="button"
                className={styles.detailBtn}
                onClick={() => { setEditContent(artifact.content); setEditMode(false); }}
              >
                Cancel
              </button>
            </div>
          </>
        ) : isCode ? (
          <pre className={styles.detailCode}><code>{editContent}</code></pre>
        ) : (
          <div className={styles.detailText}>
            {editContent.split("\n").map((line, i) => (
              <span key={i}>{line}<br /></span>
            ))}
          </div>
        )}
      </div>

      <div className={styles.detailActions}>
        {!editMode && (
          <button
            type="button"
            className={styles.detailBtn}
            onClick={() => setEditMode(true)}
            title="Edit content (local only)"
          >
            <PencilIcon size={12} />
            Edit
          </button>
        )}
        <button
          type="button"
          className={`${styles.detailBtn} ${copied ? styles.detailBtnPrimary : ""}`}
          onClick={handleCopy}
          title="Copy to clipboard"
        >
          {copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
          {copied ? "Copied" : "Copy"}
        </button>
        <button
          type="button"
          className={`${styles.detailBtn} ${styles.detailBtnDanger}`}
          onClick={() => onDelete(artifact.id)}
          title="Remove from list (local only)"
        >
          <Trash2Icon size={12} />
          Delete
        </button>
      </div>
    </div>
  );
}
