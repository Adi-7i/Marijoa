"use client";

import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible label for screen readers (required for icon-only buttons) */
  "aria-label": string;
  children: ReactNode;
  className?: string;
}

/**
 * Reusable icon button with accessible defaults and hover state.
 */
export function IconButton({
  children,
  className,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center rounded-lg",
        "text-neutral-400 transition-colors duration-150",
        "hover:text-neutral-600 hover:bg-neutral-100",
        "focus-ring",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
