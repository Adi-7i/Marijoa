"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { Notice } from "@/components/ui/Notice";
import { validateEmail, validatePassword } from "@/lib/auth-validation";
import { mockLogin } from "@/lib/mock/mock-auth";
import { showToast } from "@/lib/toast";
import styles from "./auth.module.css";

interface FieldErrors {
  email?: string | null;
  password?: string | null;
  form?: string | null;
}

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  function validate(): FieldErrors {
    return {
      email: validateEmail(email),
      password: validatePassword(password, 1),
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const next = validate();
    setErrors(next);
    if (next.email || next.password) return;
    setSubmitting(true);
    try {
      const user = await mockLogin(email, password);
      showToast(`Signed in as ${user.name} (mock).`, { variant: "success" });
      router.push("/chat");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign-in failed.";
      setErrors({ form: message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <header className={styles.formHeader}>
        <h2 className={styles.formTitle}>Welcome back</h2>
        <p className={styles.formSubtitle}>
          Sign in to continue to your Marijoa workspace.
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
          autoComplete="email"
          inputMode="email"
          required
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setErrors((p) => ({ ...p, email: validateEmail(email) }))}
          error={errors.email ?? undefined}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() =>
            setErrors((p) => ({ ...p, password: validatePassword(password, 1) }))
          }
          error={errors.password ?? undefined}
        />

        <div className={styles.formRow}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            Remember me
          </label>
          <Link href="/forgot-password" className={styles.inlineLink}>
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          disabled={submitting}
          aria-label="Sign in"
        >
          {submitting && <Spinner aria-label="Signing in" />}
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className={styles.divider}>or</div>

      <p className={styles.footerCopy}>
        New to Marijoa?{" "}
        <Link href="/signup" className={styles.inlineLink}>
          Create an account
        </Link>
      </p>

      <p className={styles.fineprint}>
        Mock authentication — no backend is contacted. Real login will connect
        to the Marijoa backend during the integration phase.
      </p>
    </>
  );
}
