"use client";

import { useEffect, useRef, useState } from "react";
import { createOrganization } from "@/lib/api/organizations";
import { ApiError } from "@/lib/api/errors";
import type { Organization } from "@/types/marijoa";
import { Spinner } from "@/components/ui/Spinner";
import styles from "@/components/artifacts/artifacts.module.css";

interface CreateOrganizationModalProps {
  onSuccess: (org: Organization) => void;
  onCancel: () => void;
}

export function CreateOrganizationModal({ onSuccess, onCancel }: CreateOrganizationModalProps) {
  const [name, setName] = useState("");
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
    const trimmed = name.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const org = await createOrganization({ name: trimmed });
      onSuccess(org);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Could not create organization. Please try again.";
      setError(message);
      setSubmitting(false);
    }
  }

  return (
    <div
      className={styles.modalOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-org-title"
      onClick={(e) => {
        if (!submitting && e.target === e.currentTarget) onCancel();
      }}
    >
      <form className={styles.modalBox} onSubmit={handleSubmit}>
        <h2 className={styles.modalTitle} id="create-org-title">
          Create organization
        </h2>

        <label className={styles.modalLabel} htmlFor="create-org-name">
          Organization name
        </label>
        <input
          id="create-org-name"
          ref={inputRef}
          type="text"
          className={styles.modalInput}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError(null);
          }}
          placeholder="Acme, Inc."
          maxLength={120}
          autoComplete="organization"
          required
          disabled={submitting}
          aria-invalid={error ? "true" : "false"}
        />

        {error && (
          <p role="alert" style={{ marginTop: 12, color: "#b91c1c", fontSize: 13 }}>
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
            {submitting && <Spinner aria-label="Creating organization" />}
            {submitting ? "Creating…" : "Create organization"}
          </button>
        </div>
      </form>
    </div>
  );
}
