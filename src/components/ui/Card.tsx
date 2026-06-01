"use client";

import type { HTMLAttributes, ReactNode } from "react";
import styles from "./ui.module.css";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  interactive?: boolean;
  padding?: "sm" | "md" | "lg";
}

export function Card({
  children,
  interactive,
  padding = "md",
  className,
  ...rest
}: CardProps) {
  const classes = [
    styles.card,
    interactive ? styles.cardInteractive : "",
    padding === "lg" ? styles.cardPadLg : "",
    padding === "sm" ? styles.cardPadSm : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
