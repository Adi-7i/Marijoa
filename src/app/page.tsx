"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isMockAuthenticated } from "@/lib/mock/mock-auth";
import { Spinner } from "@/components/ui/Spinner";
import styles from "@/components/auth/auth.module.css";

// Mock auth only. Replace with backend session check during integration phase.
export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(isMockAuthenticated() ? "/chat" : "/login");
  }, [router]);

  return (
    <div className={styles.guardScreen} role="status" aria-live="polite">
      <Spinner aria-label="Loading" />
      <span className={styles.guardScreenText}>Redirecting…</span>
    </div>
  );
}
