"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { CheckIcon } from "@/components/chat/icons";
import { validateEmail } from "@/lib/auth-validation";
import styles from "./auth.module.css";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const next = validateEmail(email);
    setError(next);
    if (next) return;
    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    setSubmitting(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <>
        <header className={styles.formHeader}>
          <h2 className={styles.formTitle}>Check your email</h2>
        </header>
        <div className={styles.successCard} role="status">
          <span className={styles.successIcon} aria-hidden="true">
            <CheckIcon size={20} />
          </span>
          <span className={styles.successTitle}>Mock reset link prepared</span>
          <span className={styles.successDesc}>
            Password reset flow will be connected during backend integration.
            No real email has been sent.
          </span>
        </div>
        <p className={styles.footerCopy}>
          <Link href="/login" className={styles.inlineLink}>
            Back to sign in
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <header className={styles.formHeader}>
        <h2 className={styles.formTitle}>Reset your password</h2>
        <p className={styles.formSubtitle}>
          Enter the email tied to your Marijoa account and we&apos;ll send a
          reset link once backend integration is live.
        </p>
      </header>

      <form onSubmit={handleSubmit} noValidate className={styles.formStack}>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setError(validateEmail(email))}
          error={error ?? undefined}
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          disabled={submitting}
          aria-label="Send reset link"
        >
          {submitting && <Spinner aria-label="Sending" />}
          {submitting ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <p className={styles.footerCopy}>
        Remembered it?{" "}
        <Link href="/login" className={styles.inlineLink}>
          Back to sign in
        </Link>
      </p>

      <p className={styles.fineprint}>
        Mock action — no email is sent. Real reset will connect to the Marijoa
        backend during the integration phase.
      </p>
    </>
  );
}
