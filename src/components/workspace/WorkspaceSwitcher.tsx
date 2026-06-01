"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Workspace } from "@/types/marijoa";
import { LayersIcon, ChevronIcon } from "@/components/chat/icons";
import styles from "./workspace.module.css";

interface WorkspaceSwitcherProps {
  workspaces: Workspace[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function WorkspaceSwitcher({ workspaces, selectedId, onSelect }: WorkspaceSwitcherProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const selected = workspaces.find((w) => w.id === selectedId);

  const handleSelect = useCallback(
    (id: string) => {
      onSelect(id);
      setOpen(false);
    },
    [onSelect]
  );

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (workspaces.length === 0) return null;

  return (
    <div className={styles.wsSwitcherWrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.wsSwitcherBtn}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Current workspace: ${selected?.name ?? "None"}`}
        onClick={() => setOpen((o) => !o)}
      >
        <LayersIcon size={13} className={styles.wsIcon} />
        <span className={styles.wsName}>{selected?.name ?? "Select workspace"}</span>
        <ChevronIcon
          size={11}
          className={`${styles.wsChevron} ${open ? styles.wsChevronOpen : ""}`}
        />
      </button>

      {open && (
        <ul className={styles.wsDropdown} role="listbox" aria-label="Workspaces">
          {workspaces.map((ws) => (
            <li key={ws.id} role="option" aria-selected={ws.id === selectedId}>
              <button
                type="button"
                className={`${styles.wsDropdownItem} ${ws.id === selectedId ? styles.wsDropdownItemActive : ""}`}
                onClick={() => handleSelect(ws.id)}
              >
                <span className={styles.wsDropdownItemName}>{ws.name}</span>
                {ws.isDefault && (
                  <span className={styles.wsDropdownItemDefault}>default</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
