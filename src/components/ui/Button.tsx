"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./ui.module.css";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: styles.btnPrimary,
  secondary: styles.btnSecondary,
  ghost: styles.btnGhost,
  danger: styles.btnDanger,
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: styles.btnSm,
  md: "",
  lg: styles.btnLg,
};

export function Button({
  variant = "secondary",
  size = "md",
  leftIcon,
  rightIcon,
  fullWidth,
  className,
  children,
  type,
  ...rest
}: ButtonProps) {
  const classes = [
    styles.btn,
    VARIANT_CLASS[variant],
    SIZE_CLASS[size],
    fullWidth ? "" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button
      type={type ?? "button"}
      className={classes}
      style={fullWidth ? { width: "100%" } : undefined}
      {...rest}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  );
}
