"use client";

/**
 * Compact ChatGPT/Gemini-style popover triggered by the composer's "+" icon.
 *
 * Items:
 *   - Upload files     → opens existing file panel (onAttach).
 *   - Web Search       → toggles web_mode auto↔off.
 *   - Deep Research    → disabled placeholder, shows coming-soon notice.
 *
 * The menu never submits the message, never creates a chat, and never
 * reaches outside the chat workspace. All buttons are type="button".
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { PlusIcon, UploadIcon } from "@/components/chat/icons";
import styles from "./ChatToolsMenu.module.css";

interface ChatToolsMenuProps {
  webSearchEnabled: boolean;
  onToggleWebSearch: (next: boolean) => void;
  onAttach?: () => void;
  className?: string;
}

function GlobeIcon({ size = 16 }: { size?: number }) {
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

function ResearchIcon({ size = 16 }: { size?: number }) {
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
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
      <path d="M8 11h6" />
      <path d="M11 8v6" />
    </svg>
  );
}

const DEEP_RESEARCH_NOTICE =
  "Deep Research is coming soon. Current web search uses fast source lookup.";

export function ChatToolsMenu({
  webSearchEnabled,
  onToggleWebSearch,
  onAttach,
  className,
}: ChatToolsMenuProps) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const handleUpload = useCallback(
    (event: ReactKeyboardEvent | { preventDefault: () => void; stopPropagation: () => void }) => {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      if (!onAttach) {
        setNotice("Select or create a workspace before uploading files.");
        return;
      }
      onAttach();
    },
    [onAttach]
  );

  const handleToggleWeb = useCallback(() => {
    onToggleWebSearch(!webSearchEnabled);
    setOpen(false);
  }, [onToggleWebSearch, webSearchEnabled]);

  const handleDeepResearch = useCallback(() => {
    setOpen(false);
    setNotice(DEEP_RESEARCH_NOTICE);
  }, []);

  return (
    <div ref={wrapperRef} className={`${styles.wrapper} ${className ?? ""}`}>
      <button
        ref={triggerRef}
        type="button"
        className={`${styles.trigger} ${webSearchEnabled ? styles.triggerWebOn : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open chat tools"
        title="Tools"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((prev) => !prev);
        }}
      >
        <PlusIcon size={18} />
        {webSearchEnabled && (
          <span className={styles.triggerBadge} aria-hidden="true">
            <GlobeIcon size={10} />
          </span>
        )}
      </button>

      {open && (
        <div role="menu" aria-label="Chat tools" className={styles.menu}>
          <button
            type="button"
            role="menuitem"
            className={styles.menuItem}
            onClick={handleUpload}
          >
            <span className={styles.menuItemIcon}>
              <UploadIcon size={16} />
            </span>
            <span className={styles.menuItemBody}>
              <span className={styles.menuItemLabel}>Upload files</span>
              <span className={styles.menuItemHint}>Add PDFs, docs, images to this workspace</span>
            </span>
          </button>

          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={webSearchEnabled}
            className={`${styles.menuItem} ${webSearchEnabled ? styles.menuItemActive : ""}`}
            onClick={handleToggleWeb}
          >
            <span className={`${styles.menuItemIcon} ${webSearchEnabled ? styles.iconActive : ""}`}>
              <GlobeIcon size={16} />
            </span>
            <span className={styles.menuItemBody}>
              <span className={styles.menuItemLabel}>
                Web Search
                <span className={styles.menuItemState}>
                  {webSearchEnabled ? "On" : "Off"}
                </span>
              </span>
              <span className={styles.menuItemHint}>
                {webSearchEnabled
                  ? "Marijoa may search the web for fresh facts"
                  : "Answer from model knowledge only"}
              </span>
            </span>
          </button>

          <button
            type="button"
            role="menuitem"
            aria-disabled="true"
            className={`${styles.menuItem} ${styles.menuItemDisabled}`}
            onClick={handleDeepResearch}
          >
            <span className={styles.menuItemIcon}>
              <ResearchIcon size={16} />
            </span>
            <span className={styles.menuItemBody}>
              <span className={styles.menuItemLabel}>
                Deep Research
                <span className={styles.menuItemBadge}>Coming soon</span>
              </span>
              <span className={styles.menuItemHint}>Multi-source, deeper investigation</span>
            </span>
          </button>
        </div>
      )}

      {notice && (
        <div role="status" className={styles.notice}>
          {notice}
        </div>
      )}
    </div>
  );
}
