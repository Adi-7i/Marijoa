"use client";

import { useEffect, useRef, useState } from "react";
import type { ArtifactType } from "@/types/marijoa";
import type { ChatMessage } from "@/types/chat";
import { truncate } from "@/lib/format";
import { ArtifactTypeBadge } from "./ArtifactTypeBadge";
import styles from "./artifacts.module.css";

const SAVEABLE_TYPES: ArtifactType[] = ["note", "document", "proposal", "email", "prompt", "code"];

interface SaveAsArtifactModalProps {
  message: ChatMessage;
  onConfirm: (title: string, type: ArtifactType) => void;
  onCancel: () => void;
}

export function SaveAsArtifactModal({ message, onConfirm, onCancel }: SaveAsArtifactModalProps) {
  const defaultTitle = truncate(message.content, 60);
  const [title, setTitle] = useState(defaultTitle);
  const [type, setType] = useState<ArtifactType>("note");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus title input on mount; small delay for animation
    const t = setTimeout(() => inputRef.current?.select(), 80);
    return () => clearTimeout(t);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onConfirm(title.trim(), type);
  }

  return (
    <div
      className={styles.modalOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-artifact-title"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <form className={styles.modalBox} onSubmit={handleSubmit}>
        <h2 className={styles.modalTitle} id="save-artifact-title">
          Save as Artifact
        </h2>

        <label className={styles.modalLabel} htmlFor="artifact-title">
          Title
        </label>
        <input
          id="artifact-title"
          ref={inputRef}
          type="text"
          className={styles.modalInput}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Artifact title…"
          maxLength={120}
          required
        />

        <span className={styles.modalLabel}>Type</span>
        <div className={styles.modalTypeRow} role="group" aria-label="Artifact type">
          {SAVEABLE_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              className={`${styles.modalTypeBtn} ${type === t ? styles.modalTypeBtnActive : ""}`}
              onClick={() => setType(t)}
              aria-pressed={type === t}
            >
              <ArtifactTypeBadge type={t} showIcon={false} />
            </button>
          ))}
        </div>

        <div className={styles.modalFooter}>
          <button type="button" className={styles.modalBtnSecondary} onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className={styles.modalBtnPrimary} disabled={!title.trim()}>
            Save Artifact
          </button>
        </div>
      </form>
    </div>
  );
}
