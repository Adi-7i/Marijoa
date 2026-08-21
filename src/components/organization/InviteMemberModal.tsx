"use client";

import { useEffect, useRef, useState } from "react";
import { createInvitation } from "@/lib/api/invitations";
import { ApiError } from "@/lib/api/errors";
import type { InvitableRole, OrganizationInvitationWithUrl } from "@/types/marijoa";
import { Spinner } from "@/components/ui/Spinner";
import styles from "@/components/artifacts/artifacts.module.css";

interface InviteMemberModalProps {
  organizationId: string;
  onInvited: (invitation: OrganizationInvitationWithUrl) => void;
  onClose: () => void;
}

const INVITABLE_ROLES: ReadonlyArray<{ value: InvitableRole; label: string; hint: string }> = [
  { value: "ADMIN",   label: "Admin",   hint: "Full admin access except ownership" },
  { value: "MANAGER", label: "Manager", hint: "Can manage workspaces and members" },
  { value: "MEMBER",  label: "Member",  hint: "Standard team member" },
  { value: "VIEWER",  label: "Viewer",  hint: "Read-only access" },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function InviteMemberModal({
  organizationId,
  onInvited,
  onClose,
}: InviteMemberModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InvitableRole>("MEMBER");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<OrganizationInvitationWithUrl | null>(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, submitting]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || submitting) return;
    if (!EMAIL_REGEX.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await createInvitation(organizationId, {
        email: trimmed,
        role,
      });
      setInvite(created);
      onInvited(created);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Could not create invitation. Please try again.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopy() {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(invite.inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Could not copy to clipboard. Select and copy manually.");
    }
  }

  return (
    <div
      className={styles.modalOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-member-title"
      onClick={(e) => {
        if (!submitting && e.target === e.currentTarget) onClose();
      }}
    >
      <form
        className={styles.modalBox}
        onSubmit={handleSubmit}
        style={{ maxWidth: 480 }}
      >
        <h2 className={styles.modalTitle} id="invite-member-title">
          {invite ? "Invite link created" : "Invite member"}
        </h2>

        {!invite && (
          <>
            <label className={styles.modalLabel} htmlFor="invite-email">
              Email
            </label>
            <input
              id="invite-email"
              ref={inputRef}
              type="email"
              className={styles.modalInput}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              placeholder="teammate@example.com"
              maxLength={255}
              required
              disabled={submitting}
              aria-invalid={error ? "true" : "false"}
            />

            <label className={styles.modalLabel} htmlFor="invite-role">
              Role
            </label>
            <select
              id="invite-role"
              className={styles.modalInput}
              value={role}
              onChange={(e) => setRole(e.target.value as InvitableRole)}
              disabled={submitting}
              style={{ height: 36, padding: "0 10px", appearance: "auto" }}
            >
              {INVITABLE_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label} — {r.hint}
                </option>
              ))}
            </select>

            <p
              style={{
                margin: "0 0 14px",
                fontSize: 12,
                color: "var(--color-text-muted)",
                lineHeight: 1.5,
              }}
            >
              Email delivery is not configured yet. After the invite is created,
              copy the link and share it with the invited person manually.
            </p>

            {error && (
              <p
                role="alert"
                style={{ marginTop: 4, marginBottom: 12, color: "#b91c1c", fontSize: 13 }}
              >
                {error}
              </p>
            )}

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.modalBtnSecondary}
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.modalBtnPrimary}
                disabled={!email.trim() || submitting}
                aria-busy={submitting}
              >
                {submitting && <Spinner aria-label="Creating invitation" />}
                {submitting ? "Creating…" : "Create invite link"}
              </button>
            </div>
          </>
        )}

        {invite && (
          <div>
            <p style={{ marginTop: 0, marginBottom: 12, fontSize: 13.5, lineHeight: 1.5 }}>
              Share this link with <strong>{invite.email}</strong> as a <strong>{invite.role}</strong>.
              They will create an account and wait for admin approval.
            </p>
            <label className={styles.modalLabel} htmlFor="invite-url">
              Invite link
            </label>
            <input
              id="invite-url"
              type="text"
              readOnly
              className={styles.modalInput}
              value={invite.inviteUrl}
              onFocus={(e) => e.currentTarget.select()}
              style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 12 }}
            />
            <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--color-text-muted)" }}>
              Link expires {new Date(invite.expiresAt).toLocaleString()}.
            </p>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.modalBtnSecondary}
                onClick={onClose}
              >
                Done
              </button>
              <button
                type="button"
                className={styles.modalBtnPrimary}
                onClick={handleCopy}
              >
                {copied ? "Copied!" : "Copy link"}
              </button>
            </div>

            {error && (
              <p
                role="alert"
                style={{ marginTop: 12, color: "#b91c1c", fontSize: 13 }}
              >
                {error}
              </p>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
