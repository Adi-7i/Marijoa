"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WebMode } from "@/types/marijoa";
import styles from "./WebModeSelector.module.css";

interface WebModeSelectorProps {
  mode: WebMode;
  onChange: (mode: WebMode) => void;
  className?: string;
  disabled?: boolean;
}

interface ModeOption {
  value: WebMode;
  label: string;
  hint: string;
}

const OPTIONS: ModeOption[] = [
  {
    value: "auto",
    label: "Auto",
    hint: "Search the web only when the question needs current info.",
  },
  {
    value: "search",
    label: "Search",
    hint: "Always search the web for this message.",
  },
  {
    value: "off",
    label: "Off",
    hint: "Never search. Answer from model knowledge only.",
  },
];

function GlobeIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14.5 14.5 0 0 1 0 18" />
      <path d="M12 3a14.5 14.5 0 0 0 0 18" />
    </svg>
  );
}

export function WebModeSelector({
  mode,
  onChange,
  className,
  disabled = false,
}: WebModeSelectorProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const handleSelect = useCallback(
    (next: WebMode) => {
      onChange(next);
      setOpen(false);
    },
    [onChange]
  );

  const current = OPTIONS.find((o) => o.value === mode) ?? OPTIONS[0];
  const buttonClass = [
    styles.button,
    mode === "search" ? styles.activeSearch : "",
    mode === "off" ? styles.activeOff : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={wrapperRef} className={`${styles.wrapper} ${className ?? ""}`}>
      <button
        type="button"
        className={buttonClass}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Web mode: ${current.label}`}
        title={current.hint}
        onClick={() => setOpen((prev) => !prev)}
        disabled={disabled}
      >
        <span className={styles.iconWrap}>
          <GlobeIcon />
        </span>
        <span>Web: {current.label}</span>
      </button>
      {open && (
        <div role="menu" className={styles.menu}>
          {OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="menuitemradio"
              aria-checked={option.value === mode}
              className={`${styles.menuItem} ${option.value === mode ? styles.selected : ""}`}
              onClick={() => handleSelect(option.value)}
            >
              <span>
                <span className={styles.menuLabel}>{option.label}</span>
                <span className={styles.menuHint} style={{ display: "block" }}>
                  {option.hint}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
