"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { Spinner } from "@/components/ui/Spinner";
import styles from "@/components/auth/auth.module.css";

export default function HomePage() {
  const router = useRouter();
  const { status } = useAuth();

  useEffect(() => {
    if (status === "authenticated") router.replace("/chat");
    else if (status === "unauthenticated") router.replace("/login");
  }, [router, status]);

  return (
    <div className={styles.guardScreen} role="status" aria-live="polite">
      <Spinner aria-label="Loading" />
      <span className={styles.guardScreenText}>
        {status === "loading" ? "Checking session…" : "Redirecting…"}
      </span>
    </div>
  );
}
