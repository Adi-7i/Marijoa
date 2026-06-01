"use client";

import { useCallback, useState } from "react";
import type { Artifact } from "@/types/marijoa";
import { ChevronIcon, CopyIcon, CheckIcon, PencilIcon, Trash2Icon } from "@/components/chat/icons";
import { formatRelative } from "@/lib/format";
import { ArtifactTypeBadge } from "./ArtifactTypeBadge";
import { updateArtifact } from "@/lib/api/artifacts";
import { ApiError } from "@/lib/api/errors";
import { showToast } from "@/lib/toast";
import styles from "./artifacts.module.css";

interface ArtifactDetailProps {
  artifact: Artifact;
  onBack: () => void;
  onDelete?: (id: string) => void | Promise<void>;
  onUpdated?: (artifact: Artifact) => void;
}

export function ArtifactDetail({ artifact, onBack, onDelete, onUpdated }: ArtifactDetailProps) {
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState(artifact.content);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard?.writeText(artifact.content);
    } catch {
      // clipboard unavailable
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [artifact.content]);

  const handleSaveEdit = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const updated = await updateArtifact(artifact.id, { content: editContent });
      onUpdated?.(updated);
      setEditMode(false);
      showToast("Artifact updated.", { variant: "success" });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not update artifact.";
      showToast(message, { variant: "error" });
    } finally {
      setSaving(false);
    }
  }, [artifact.id, editContent, onUpdated, saving]);

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
              disabled={saving}
            />
            <div className={styles.editActions}>
              <button
                type="button"
                className={`${styles.detailBtn} ${styles.detailBtnPrimary}`}
                onClick={handleSaveEdit}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                className={styles.detailBtn}
                onClick={() => { setEditContent(artifact.content); setEditMode(false); }}
                disabled={saving}
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
            title="Edit artifact"
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
        {onDelete && (
          <button
            type="button"
            className={`${styles.detailBtn} ${styles.detailBtnDanger}`}
            onClick={() => void onDelete(artifact.id)}
            title="Delete artifact"
          >
            <Trash2Icon size={12} />
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
