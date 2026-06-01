"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { Notice } from "@/components/ui/Notice";
import {
  validateEmail,
  validateName,
  validatePassword,
  validatePasswordsMatch,
} from "@/lib/auth-validation";
import { useAuth } from "@/lib/auth/auth-context";
import { ApiError } from "@/lib/api/errors";
import { showToast } from "@/lib/toast";
import { PasswordStrengthHint } from "./PasswordStrengthHint";
import styles from "./auth.module.css";

interface FieldErrors {
  fullName?: string | null;
  email?: string | null;
  password?: string | null;
  confirmPassword?: string | null;
  form?: string | null;
}

export function SignupForm() {
  const router = useRouter();
  const { register } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  function validate(): FieldErrors {
    return {
      fullName: validateName(fullName),
      email: validateEmail(email),
      password: validatePassword(password),
      confirmPassword: validatePasswordsMatch(password, confirmPassword),
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const next = validate();
    setErrors(next);
    if (next.fullName || next.email || next.password || next.confirmPassword)
      return;
    setSubmitting(true);
    try {
      const user = await register({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
      });
      showToast(`Welcome, ${user.name}!`, { variant: "success" });
      router.replace("/chat");
    } catch (err) {
      if (err instanceof ApiError && err.isConflict) {
        setErrors({ form: "An account with this email already exists." });
      } else if (err instanceof ApiError) {
        setErrors({ form: err.message });
      } else {
        setErrors({
          form: err instanceof Error ? err.message : "Could not create account.",
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <header className={styles.formHeader}>
        <h2 className={styles.formTitle}>Create your workspace</h2>
        <p className={styles.formSubtitle}>
          Start with a personal AI workspace. You can upgrade to organization
          workspaces later.
        </p>
      </header>

      {errors.form && (
        <Notice>
          <span role="alert">{errors.form}</span>
        </Notice>
      )}

      <form onSubmit={handleSubmit} noValidate className={styles.formStack}>
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
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setErrors((p) => ({ ...p, email: validateEmail(email) }))}
          error={errors.email ?? undefined}
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
          aria-label="Create account"
        >
          {submitting && <Spinner aria-label="Creating account" />}
          {submitting ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className={styles.footerCopy}>
        Already have an account?{" "}
        <Link href="/login" className={styles.inlineLink}>
          Sign in
        </Link>
      </p>

      <p className={styles.fineprint}>
        By creating an account you agree to our terms and privacy notice.
      </p>
    </>
  );
}
