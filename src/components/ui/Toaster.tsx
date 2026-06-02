"use client";

import { dismissToast, useToasts } from "@/lib/toast";
import styles from "./ui.module.css";

const VARIANT_CLASS = {
  info: styles.toastInfo,
  success: styles.toastSuccess,
  error: styles.toastError,
};

export function Toaster() {
  const toasts = useToasts();
  if (toasts.length === 0) return null;
  return (
    <div className={styles.toastRegion} aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <div key={t.id} className={`${styles.toast} ${VARIANT_CLASS[t.variant]}`} role="status">
          <span className={styles.toastMessage}>{t.message}</span>
          <button
            type="button"
            aria-label="Dismiss notification"
            className={styles.toastClose}
            onClick={() => dismissToast(t.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
