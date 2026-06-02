"use client";

import type { ReactNode } from "react";
import styles from "./ui.module.css";

interface NoticeProps {
  children: ReactNode;
  variant?: "info" | "default";
  className?: string;
}

export function Notice({ children, variant = "default", className }: NoticeProps) {
  const cls = [
    styles.inlineNotice,
    variant === "info" ? styles.inlineNoticeInfo : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div role="note" className={cls}>
      {children}
    </div>
  );
}
