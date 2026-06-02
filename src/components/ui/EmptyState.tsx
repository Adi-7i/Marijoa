"use client";

import type { ReactNode } from "react";
import styles from "./ui.module.css";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={[styles.emptyState, className ?? ""].filter(Boolean).join(" ")}
    >
      {icon && <div className={styles.emptyIcon}>{icon}</div>}
      <div className={styles.emptyTitle}>{title}</div>
      {description && <div className={styles.emptyDesc}>{description}</div>}
      {action && <div className={styles.emptyAction}>{action}</div>}
    </div>
  );
}
