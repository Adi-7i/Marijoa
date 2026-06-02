"use client";

import { useEffect, useRef, useState } from "react";
import { createWorkspace } from "@/lib/api/workspaces";
import { ApiError } from "@/lib/api/errors";
import type { Workspace } from "@/types/marijoa";
import { Spinner } from "@/components/ui/Spinner";
import styles from "@/components/artifacts/artifacts.module.css";

interface AddWorkspaceModalProps {
  organizationId: string;
  onSuccess: (workspace: Workspace) => void;
  onCancel: () => void;
}

export function AddWorkspaceModal({
  organizationId,
  onSuccess,
  onCancel,
}: AddWorkspaceModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemInstruction, setSystemInstruction] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel, submitting]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || submitting) return;
    if (trimmedName.length < 2) {
      setError("Workspace name must be at least 2 characters.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const workspace = await createWorkspace({
        organizationId,
        name: trimmedName,
        description: description.trim() || undefined,
        systemInstruction: systemInstruction.trim() || undefined,
      });
      onSuccess(workspace);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Could not create workspace. Please try again.";
      setError(message);
      setSubmitting(false);
    }
  }

  return (
    <div
      className={styles.modalOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-workspace-title"
      onClick={(e) => {
        if (!submitting && e.target === e.currentTarget) onCancel();
      }}
    >
      <form className={styles.modalBox} onSubmit={handleSubmit}>
        <h2 className={styles.modalTitle} id="add-workspace-title">
          Add workspace
        </h2>

        <label className={styles.modalLabel} htmlFor="add-workspace-name">
          Workspace name
        </label>
        <input
          id="add-workspace-name"
          ref={inputRef}
          type="text"
          className={styles.modalInput}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError(null);
          }}
          placeholder="Sales Team"
          maxLength={160}
          required
          disabled={submitting}
          aria-invalid={error ? "true" : "false"}
        />

        <label className={styles.modalLabel} htmlFor="add-workspace-desc">
          Description (optional)
        </label>
        <input
          id="add-workspace-desc"
          type="text"
          className={styles.modalInput}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What this workspace is for"
          maxLength={1000}
          disabled={submitting}
        />

        <label className={styles.modalLabel} htmlFor="add-workspace-sysprompt">
          System instruction (optional)
        </label>
        <textarea
          id="add-workspace-sysprompt"
          className={styles.modalInput}
          style={{ height: 76, paddingTop: 8, paddingBottom: 8, resize: "vertical" }}
          value={systemInstruction}
          onChange={(e) => setSystemInstruction(e.target.value)}
          placeholder="Custom instructions sent to the AI for this workspace"
          maxLength={8000}
          disabled={submitting}
        />

        {error && (
          <p role="alert" style={{ marginTop: 4, marginBottom: 12, color: "#b91c1c", fontSize: 13 }}>
            {error}
          </p>
        )}

        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.modalBtnSecondary}
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={styles.modalBtnPrimary}
            disabled={!name.trim() || submitting}
            aria-busy={submitting}
          >
            {submitting && <Spinner aria-label="Creating workspace" />}
            {submitting ? "Creating…" : "Create workspace"}
          </button>
        </div>
      </form>
    </div>
  );
}
