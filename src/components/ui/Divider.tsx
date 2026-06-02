"use client";

import styles from "./ui.module.css";

export function Divider({
  orientation = "horizontal",
  className,
}: {
  orientation?: "horizontal" | "vertical";
  className?: string;
}) {
  const cls = [
    orientation === "vertical" ? styles.dividerVertical : styles.divider,
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
  return <div role="separator" aria-orientation={orientation} className={cls} />;
}
