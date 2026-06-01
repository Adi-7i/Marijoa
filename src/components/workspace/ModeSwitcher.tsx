"use client";

import type { AppMode } from "@/types/marijoa";
import { PersonIcon, BuildingIcon } from "@/components/chat/icons";
import styles from "./workspace.module.css";

interface ModeSwitcherProps {
  mode: AppMode;
  onChange: (mode: AppMode) => void;
}

export function ModeSwitcher({ mode, onChange }: ModeSwitcherProps) {
  return (
    <div className={styles.modeToggle} role="group" aria-label="Switch workspace mode">
      <button
        type="button"
        role="radio"
        aria-checked={mode === "personal"}
        className={`${styles.modeBtn} ${mode === "personal" ? styles.modeBtnActive : ""}`}
        onClick={() => onChange("personal")}
      >
        <PersonIcon size={13} />
        Personal
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={mode === "organization"}
        className={`${styles.modeBtn} ${mode === "organization" ? styles.modeBtnActive : ""}`}
        onClick={() => onChange("organization")}
      >
        <BuildingIcon size={13} />
        Org
      </button>
    </div>
  );
}
