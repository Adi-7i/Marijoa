"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { Spinner } from "@/components/ui/Spinner";
import { Notice } from "@/components/ui/Notice";
import styles from "./auth.module.css";

interface AuthGuardProps {
  children: ReactNode;
  redirectTo?: string;
}

export function AuthGuard({ children, redirectTo = "/login" }: AuthGuardProps) {
  const router = useRouter();
  const { status, bootstrapError, refresh } = useAuth();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(redirectTo);
    }
  }, [redirectTo, router, status]);

  if (status === "authenticated") return <>{children}</>;

  return (
    <div className={styles.guardScreen} role="status" aria-live="polite">
      <Spinner aria-label="Checking session" />
      <span className={styles.guardScreenText}>
        {status === "loading" ? "Checking session…" : "Redirecting…"}
      </span>
      {bootstrapError && status !== "loading" && (
        <div style={{ maxWidth: 420 }}>
          <Notice>
            <span role="alert">{bootstrapError}</span>
            <button
              type="button"
              onClick={() => void refresh()}
              className={styles.inlineLink}
              style={{ marginLeft: 8 }}
            >
              Retry
            </button>
          </Notice>
        </div>
      )}
    </div>
  );
}
