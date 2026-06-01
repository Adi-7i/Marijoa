"use client";

import type { CSSProperties } from "react";
import styles from "./ui.module.css";

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  circle?: boolean;
  className?: string;
  style?: CSSProperties;
  "aria-label"?: string;
}

export function Skeleton({
  width,
  height,
  circle = false,
  className,
  style,
  "aria-label": ariaLabel = "Loading",
}: SkeletonProps) {
  const cls = [styles.skeleton, circle ? styles.skeletonCircle : "", className ?? ""]
    .filter(Boolean)
    .join(" ");
  return (
    <span
      className={cls}
      aria-label={ariaLabel}
      aria-busy="true"
      role="status"
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
        ...style,
      }}
    />
  );
}

interface SkeletonLinesProps {
  count?: number;
  className?: string;
}

export function SkeletonLines({ count = 3, className }: SkeletonLinesProps) {
  const widths = ["100%", "92%", "78%", "85%", "70%", "95%"];
  return (
    <div className={className} aria-busy="true" role="status" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className={`${styles.skeleton} ${styles.skeletonLine}`}
          style={{ width: widths[i % widths.length] }}
        />
      ))}
    </div>
  );
}
