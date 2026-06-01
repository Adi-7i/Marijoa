"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { isMockAuthenticated } from "@/lib/mock/mock-auth";
import { Spinner } from "@/components/ui/Spinner";
import styles from "./auth.module.css";

interface GuestGuardProps {
  children: ReactNode;
  redirectTo?: string;
}

// Mock auth only. Replace with backend session check during integration phase.
export function GuestGuard({ children, redirectTo = "/chat" }: GuestGuardProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "guest" | "redirecting">(
    "checking"
  );

  useEffect(() => {
    if (isMockAuthenticated()) {
      setStatus("redirecting");
      router.replace(redirectTo);
    } else {
      setStatus("guest");
    }
  }, [router, redirectTo]);

  if (status === "guest") return <>{children}</>;

  return (
    <div className={styles.guardScreen} role="status" aria-live="polite">
      <Spinner aria-label="Checking session" />
      <span className={styles.guardScreenText}>
        {status === "redirecting" ? "Redirecting…" : "Checking session…"}
      </span>
    </div>
  );
}
