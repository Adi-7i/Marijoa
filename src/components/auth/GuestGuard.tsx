"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { Spinner } from "@/components/ui/Spinner";
import styles from "./auth.module.css";

interface GuestGuardProps {
  children: ReactNode;
  redirectTo?: string;
}

export function GuestGuard({ children, redirectTo = "/chat" }: GuestGuardProps) {
  const router = useRouter();
  const { status } = useAuth();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(redirectTo);
    }
  }, [redirectTo, router, status]);

  if (status === "unauthenticated") return <>{children}</>;

  return (
    <div className={styles.guardScreen} role="status" aria-live="polite">
      <Spinner aria-label="Checking session" />
      <span className={styles.guardScreenText}>
        {status === "loading" ? "Checking session…" : "Redirecting…"}
      </span>
    </div>
  );
}
