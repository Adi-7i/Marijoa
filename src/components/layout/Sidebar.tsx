"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { APP_NAME, CHAT_HISTORY, USER_INITIALS, USER_NAME } from "@/lib/constants";
import { ChatHistoryList } from "@/components/chat/ChatHistoryList";
import { UserProfile } from "@/components/chat/UserProfile";
import { MarijoaMark, PanelIcon, PlusIcon, SearchIcon } from "@/components/chat/icons";
import styles from "@/components/chat/chat-ui.module.css";

interface SidebarProps {
  onNewChat?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
  width?: number;
  onResizeStart?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  className?: string;
}

export function Sidebar({ onNewChat, isOpen = false, onClose, width, onResizeStart, className }: SidebarProps) {
  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const firstButton = sidebarRef.current?.querySelector<HTMLButtonElement>("button");
    firstButton?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose?.();
      if (event.key !== "Tab") return;

      const focusable = Array.from(
        sidebarRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
        ) ?? []
      ).filter((element) => !element.hasAttribute("disabled"));

      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <aside
      ref={sidebarRef}
      aria-label="Main navigation"
      className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ""} ${className ?? ""}`}
      style={{ "--sidebar-live-width": width ? `${width}px` : undefined } as CSSProperties}
      onTouchStart={(event) => {
        const startX = event.touches[0]?.clientX ?? 0;
        const handleMove = (moveEvent: TouchEvent) => {
          const currentX = moveEvent.touches[0]?.clientX ?? startX;
          if (startX - currentX > 70) {
            onClose?.();
            window.removeEventListener("touchmove", handleMove);
          }
        };
        window.addEventListener("touchmove", handleMove, { passive: true, once: true });
      }}
    >
      <div className={styles.sidebarTop}>
        <div className={styles.brand}>
          <MarijoaMark className={styles.logo} />
          <span className={styles.brandText}>{APP_NAME}</span>
        </div>
        <button type="button" className={styles.collapseButton} aria-label="Collapse sidebar" onClick={onClose}>
          <PanelIcon />
        </button>
      </div>

      <div className={styles.newChatWrap}>
        <button type="button" onClick={onNewChat} aria-label="Start a new chat" className={styles.newChat}>
          <PlusIcon />
          <span>New Chat</span>
        </button>
      </div>

      <div className={styles.searchWrap}>
        <button type="button" aria-label="Search chat history" className={styles.searchButton}>
          <SearchIcon />
          <span>Search Chats</span>
        </button>
      </div>

      <div className={styles.chatListArea}>
        <p className={styles.sectionLabel}>Chats</p>
        <ChatHistoryList items={CHAT_HISTORY} activeId={activeId} onSelect={setActiveId} />
      </div>

      <UserProfile user={{ name: USER_NAME, initials: USER_INITIALS }} />
      <div className={styles.resizeHandle} role="separator" aria-orientation="vertical" aria-label="Resize sidebar" onPointerDown={onResizeStart} />
    </aside>
  );
}
