"use client";

import styles from "./ui.module.css";

interface SpinnerProps {
  size?: "sm" | "md";
  className?: string;
  "aria-label"?: string;
}

export function Spinner({ size = "sm", className, "aria-label": ariaLabel = "Loading" }: SpinnerProps) {
  const cls = [styles.spinner, size === "md" ? styles.spinnerLg : "", className ?? ""]
    .filter(Boolean)
    .join(" ");
  return <span className={cls} role="status" aria-label={ariaLabel} />;
}
