"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { APP_NAME } from "@/lib/constants";
import type { AppMode, Chat, Organization, User, Workspace } from "@/types/marijoa";
import { ChatHistoryList } from "@/components/chat/ChatHistoryList";
import { UserProfile } from "@/components/chat/UserProfile";
import { MarijoaMark, PanelIcon, PlusIcon, SearchIcon, SettingsIcon } from "@/components/chat/icons";
import { ModeSwitcher } from "@/components/workspace/ModeSwitcher";
import { WorkspaceList } from "@/components/workspace/WorkspaceList";
import styles from "@/components/chat/chat-ui.module.css";

interface SidebarProps {
  onNewChat?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
  width?: number;
  onResizeStart?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  className?: string;
  // Workspace state
  mode?: AppMode;
  onModeChange?: (mode: AppMode) => void;
  organizations?: Organization[];
  selectedOrgId?: string;
  workspaces?: Workspace[];
  selectedWorkspaceId?: string | null;
  onWorkspaceChange?: (workspaceId: string) => void;
  onShowOrgOverview?: () => void;
  // Chat state
  chats?: Chat[];
  selectedChatId?: string | null;
  onChatSelect?: (chatId: string) => void;
  user?: User;
}

export function Sidebar({
  onNewChat,
  isOpen = false,
  onClose,
  width,
  onResizeStart,
  className,
  mode = "personal",
  onModeChange,
  organizations = [],
  selectedOrgId,
  workspaces = [],
  selectedWorkspaceId = null,
  onWorkspaceChange,
  onShowOrgOverview,
  chats = [],
  selectedChatId = null,
  onChatSelect,
  user,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const currentOrg = organizations.find((o) => o.id === selectedOrgId);

  const filteredChats = searchQuery.trim()
    ? chats.filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : chats;

  const chatHistoryItems = filteredChats.map((c) => ({
    id: c.id,
    title: c.title,
    updatedAt: c.updatedAt,
  }));

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
      ).filter((el) => !el.hasAttribute("disabled"));
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
      {/* Brand */}
      <div className={styles.sidebarTop}>
        <div className={styles.brand}>
          <MarijoaMark className={styles.logo} />
          <span className={styles.brandText}>{APP_NAME}</span>
        </div>
        <button type="button" className={styles.collapseButton} aria-label="Collapse sidebar" onClick={onClose}>
          <PanelIcon />
        </button>
      </div>

      {/* Mode switcher */}
      {onModeChange && (
        <ModeSwitcher mode={mode} onChange={onModeChange} />
      )}

      {/* Organization workspace list (org mode) */}
      {mode === "organization" && onWorkspaceChange && currentOrg && (
        <WorkspaceList
          orgName={currentOrg.name}
          orgRole={currentOrg.role}
          workspaces={workspaces}
          selectedId={selectedWorkspaceId}
          onSelect={onWorkspaceChange}
          onShowOrgOverview={onShowOrgOverview}
        />
      )}

      <div className={styles.sidebarDivider} role="separator" />

      {/* New Chat */}
      <div className={styles.newChatWrap}>
        <button type="button" onClick={onNewChat} aria-label="Start a new chat" className={styles.newChat}>
          <PlusIcon />
          <span>New Chat</span>
        </button>
      </div>

      {/* Search */}
      <div className={styles.searchWrap}>
        {searchOpen ? (
          <input
            ref={searchRef}
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats..."
            aria-label="Search chat history"
            className={styles.searchButton}
            style={{ cursor: "text" }}
            onBlur={() => {
              if (!searchQuery) setSearchOpen(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setSearchQuery("");
                setSearchOpen(false);
              }
            }}
          />
        ) : (
          <button
            type="button"
            aria-label="Search chat history"
            className={styles.searchButton}
            onClick={() => {
              setSearchOpen(true);
              setTimeout(() => searchRef.current?.focus(), 50);
            }}
          >
            <SearchIcon />
            <span>Search Chats</span>
          </button>
        )}
      </div>

      {/* Chat list */}
      <div className={styles.chatListArea}>
        <p className={styles.sectionLabel}>
          {mode === "personal" ? "Personal" : "Workspace"} Chats
        </p>
        {chatHistoryItems.length > 0 ? (
          <ChatHistoryList
            items={chatHistoryItems}
            activeId={selectedChatId ?? undefined}
            onSelect={onChatSelect}
          />
        ) : (
          <p style={{ padding: "8px 12px", fontSize: "12.5px", color: "var(--color-text-muted)" }}>
            {searchQuery ? "No chats match your search." : "No chats yet. Start one above!"}
          </p>
        )}
      </div>

      {/* Admin link (org mode only) */}
      {mode === "organization" && (
        <>
          <div className={styles.sidebarDivider} role="separator" />
          <div className={styles.adminLinkWrap}>
            <button type="button" className={styles.adminLink} aria-label="Organization admin settings">
              <SettingsIcon size={14} />
              Admin Settings
            </button>
          </div>
        </>
      )}

      {/* User profile */}
      {user ? (
        <UserProfile user={{ name: user.name, initials: user.initials }} />
      ) : null}

      <div
        className={styles.resizeHandle}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize sidebar"
        onPointerDown={onResizeStart}
      />
    </aside>
  );
}
