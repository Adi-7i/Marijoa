"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { Notice } from "@/components/ui/Notice";
import {
  validateName,
  validatePassword,
  validatePasswordsMatch,
} from "@/lib/auth-validation";
import {
  EXISTING_USER_LOGIN_REQUIRED,
  acceptInvitation,
  validateInvitation,
} from "@/lib/api/invitations";
import { ApiError } from "@/lib/api/errors";
import type { InvitationValidation } from "@/types/marijoa";
import { PasswordStrengthHint } from "./PasswordStrengthHint";
import styles from "./auth.module.css";

interface InviteAcceptFormProps {
  token: string;
}

type LoadState =
  | { status: "loading" }
  | { status: "invalid"; message: string }
  | { status: "ready"; invitation: InvitationValidation };

interface FieldErrors {
  fullName?: string | null;
  password?: string | null;
  confirmPassword?: string | null;
  form?: string | null;
}

export function InviteAcceptForm({ token }: InviteAcceptFormProps) {
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState<string>("");
  const [existingUser, setExistingUser] = useState(false);

  const fetchValidation = useCallback(async () => {
    setLoad({ status: "loading" });
    try {
      const invitation = await validateInvitation(token);
      setLoad({ status: "ready", invitation });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "This invitation link is invalid or has expired.";
      setLoad({ status: "invalid", message });
    }
  }, [token]);

  useEffect(() => {
    void fetchValidation();
  }, [fetchValidation]);

  function validate(): FieldErrors {
    return {
      fullName: validateName(fullName),
      password: validatePassword(password),
      confirmPassword: validatePasswordsMatch(password, confirmPassword),
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const next = validate();
    setErrors(next);
    if (next.fullName || next.password || next.confirmPassword) return;
    setSubmitting(true);
    try {
      const result = await acceptInvitation({
        token,
        fullName: fullName.trim(),
        password,
      });
      setSubmitted(true);
      setSubmittedMessage(result.message);
    } catch (err) {
      if (err instanceof ApiError && err.code === EXISTING_USER_LOGIN_REQUIRED) {
        setExistingUser(true);
      } else if (err instanceof ApiError) {
        setErrors({ form: err.message });
      } else {
        setErrors({
          form: err instanceof Error ? err.message : "Could not accept invitation.",
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (load.status === "loading") {
    return (
      <div className={styles.formStack} style={{ minHeight: 200, alignItems: "center", justifyContent: "center", display: "flex" }}>
        <Spinner aria-label="Loading invitation" />
      </div>
    );
  }

  if (load.status === "invalid") {
    return (
      <>
        <header className={styles.formHeader}>
          <h2 className={styles.formTitle}>Invitation unavailable</h2>
          <p className={styles.formSubtitle}>{load.message}</p>
        </header>
        <Notice>
          <span>
            Ask the admin who invited you to send a fresh invite link.
          </span>
        </Notice>
        <p className={styles.footerCopy}>
          Already have an account?{" "}
          <Link href="/login" className={styles.inlineLink}>
            Sign in
          </Link>
        </p>
      </>
    );
  }

  const invitation = load.invitation;

  if (existingUser) {
    return (
      <>
        <header className={styles.formHeader}>
          <h2 className={styles.formTitle}>You already have an account</h2>
          <p className={styles.formSubtitle}>
            <strong>{invitation.email}</strong> is already registered with
            Marijoa. Sign in and we&apos;ll prompt you to accept the invitation
            to <strong>{invitation.organizationName}</strong>.
          </p>
        </header>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
          After signing in, return to this invite link to complete acceptance.
        </p>
        <div style={{ marginTop: 16 }}>
          <Link href={`/login?invite=${encodeURIComponent(token)}`} className={styles.inlineLink}>
            <Button variant="primary" size="lg" fullWidth>
              Sign in to accept
            </Button>
          </Link>
        </div>
      </>
    );
  }

  if (submitted) {
    return (
      <>
        <header className={styles.formHeader}>
          <h2 className={styles.formTitle}>Request submitted</h2>
          <p className={styles.formSubtitle}>{submittedMessage}</p>
        </header>
        <p style={{ fontSize: 13.5, color: "var(--color-text-muted)" }}>
          Once an admin of <strong>{invitation.organizationName}</strong>{" "}
          approves your access, you can sign in and start collaborating.
        </p>
        <div style={{ marginTop: 16 }}>
          <Link href="/login" className={styles.inlineLink}>
            <Button variant="primary" size="lg" fullWidth>
              Go to sign in
            </Button>
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <header className={styles.formHeader}>
        <h2 className={styles.formTitle}>Join {invitation.organizationName}</h2>
        <p className={styles.formSubtitle}>
          You&apos;ve been invited as <strong>{invitation.role}</strong>. Create
          your account below. An admin must approve your access before you can
          sign in to this organization.
        </p>
      </header>

      {errors.form && (
        <Notice>
          <span role="alert">{errors.form}</span>
        </Notice>
      )}

      <form onSubmit={handleSubmit} noValidate className={styles.formStack}>
        <Input
          label="Email"
          type="email"
          value={invitation.email}
          readOnly
          disabled
          autoComplete="email"
          aria-readonly="true"
        />
        <Input
          label="Full name"
          autoComplete="name"
          required
          placeholder="Your name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          onBlur={() =>
            setErrors((p) => ({ ...p, fullName: validateName(fullName) }))
          }
          error={errors.fullName ?? undefined}
        />
        <div>
          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            required
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() =>
              setErrors((p) => ({ ...p, password: validatePassword(password) }))
            }
            error={errors.password ?? undefined}
          />
          <PasswordStrengthHint value={password} />
        </div>
        <Input
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          required
          placeholder="Re-enter password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          onBlur={() =>
            setErrors((p) => ({
              ...p,
              confirmPassword: validatePasswordsMatch(password, confirmPassword),
            }))
          }
          error={errors.confirmPassword ?? undefined}
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          disabled={submitting}
          aria-label="Request access"
        >
          {submitting && <Spinner aria-label="Submitting request" />}
          {submitting ? "Submitting…" : "Request access"}
        </Button>
      </form>

      <p className={styles.footerCopy}>
        Already have an account?{" "}
        <Link href="/login" className={styles.inlineLink}>
          Sign in
        </Link>
      </p>
    </>
  );
}
