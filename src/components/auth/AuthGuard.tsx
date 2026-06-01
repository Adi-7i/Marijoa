"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { isMockAuthenticated } from "@/lib/mock/mock-auth";
import { Spinner } from "@/components/ui/Spinner";
import styles from "./auth.module.css";

interface AuthGuardProps {
  children: ReactNode;
  redirectTo?: string;
}

// Mock auth only. Replace with backend session check during integration phase.
export function AuthGuard({ children, redirectTo = "/login" }: AuthGuardProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "authed" | "redirecting">(
    "checking"
  );

  useEffect(() => {
    if (isMockAuthenticated()) {
      setStatus("authed");
    } else {
      setStatus("redirecting");
      router.replace(redirectTo);
    }
  }, [router, redirectTo]);

  if (status === "authed") return <>{children}</>;

  return (
    <div className={styles.guardScreen} role="status" aria-live="polite">
      <Spinner aria-label="Checking session" />
      <span className={styles.guardScreenText}>
        {status === "redirecting" ? "Redirecting…" : "Checking session…"}
      </span>
    </div>
  );
}
