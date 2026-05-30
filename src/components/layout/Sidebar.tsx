"use client";

import { useState } from "react";
import { Plus, Search, PanelLeftClose } from "lucide-react";
import { cn } from "@/lib/cn";
import { IconButton } from "@/components/ui/IconButton";
import { ChatHistoryList } from "@/components/chat/ChatHistoryList";
import { UserProfile } from "@/components/chat/UserProfile";
import {
  APP_NAME,
  USER_NAME,
  USER_INITIALS,
  CHAT_HISTORY,
} from "@/lib/constants";

interface SidebarProps {
  onNewChat?: () => void;
  className?: string;
}

/**
 * Left sidebar: Marijoa brand, new chat button, search row,
 * chat history list, and user profile at bottom.
 */
export function Sidebar({ onNewChat, className }: SidebarProps) {
  const [activeId, setActiveId] = useState<string | undefined>(undefined);

  return (
    <aside
      aria-label="Main navigation"
      className={cn(
        "flex flex-col h-full w-[224px] flex-shrink-0",
        "bg-[#f4f4f3]",
        className
      )}
    >
      {/* ── Brand header ───────────────────────────────── */}
      <div className="flex items-center justify-between px-5 pt-[22px] pb-5">
        <div className="flex items-center gap-2">
          {/* Wordmark logo — a refined minimal mark */}
          <div
            className={cn(
              "w-[26px] h-[26px] rounded-lg flex items-center justify-center",
              "bg-neutral-800/90"
            )}
            aria-hidden="true"
          >
            {/* Two offset dots — minimal abstract mark */}
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="4" cy="6" r="2.5" fill="white" fillOpacity="1" />
              <circle cx="9" cy="6" r="1.6" fill="white" fillOpacity="0.5" />
            </svg>
          </div>

          {/* Brand text */}
          <span
            className={cn(
              "text-[16px] font-bold text-neutral-900",
              "tracking-[-0.025em] leading-none select-none"
            )}
          >
            {APP_NAME}
          </span>
        </div>

        {/* Sidebar collapse icon — structural, ready for future toggle */}
        <IconButton
          aria-label="Collapse sidebar"
          className={cn(
            "w-7 h-7 rounded-md",
            "text-neutral-400 hover:text-neutral-600",
            "hover:bg-neutral-200/60"
          )}
        >
          <PanelLeftClose size={15} strokeWidth={1.8} />
        </IconButton>
      </div>

      {/* ── New Chat button ─────────────────────────────── */}
      <div className="px-3 pb-1">
        <button
          type="button"
          onClick={onNewChat}
          aria-label="Start a new chat"
          className={cn(
            "w-full flex items-center gap-2.5 px-4 h-[40px] rounded-full",
            "bg-white text-neutral-600 text-[13px] font-medium",
            "transition-all duration-200 focus-ring",
            "hover:bg-white hover:text-neutral-800",
            "active:scale-[0.985]"
          )}
          style={{ boxShadow: "var(--shadow-new-chat)" }}
        >
          <Plus
            size={15}
            strokeWidth={2.2}
            className="text-neutral-400 flex-shrink-0"
          />
          <span>New Chat</span>
        </button>
      </div>

      {/* ── Search row ──────────────────────────────────── */}
      <div className="px-3 pt-1 pb-3">
        <button
          type="button"
          aria-label="Search chat history"
          className={cn(
            "w-full flex items-center gap-2.5 px-3 h-[34px] rounded-lg",
            "text-neutral-400 text-[13px]",
            "transition-colors duration-150 focus-ring",
            "hover:bg-neutral-200/50 hover:text-neutral-600"
          )}
        >
          <Search size={13} strokeWidth={2} className="flex-shrink-0" />
          <span>Search Chats</span>
        </button>
      </div>

      {/* ── Chat history list ───────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 pb-2">
        <p
          className={cn(
            "px-3 pb-2 pt-1",
            "text-[10px] font-semibold uppercase tracking-[0.09em]",
            "text-neutral-400 select-none"
          )}
        >
          Chats
        </p>
        <ChatHistoryList
          items={CHAT_HISTORY}
          activeId={activeId}
          onSelect={setActiveId}
        />
      </div>

      {/* ── User profile ────────────────────────────────── */}
      <UserProfile user={{ name: USER_NAME, initials: USER_INITIALS }} />
    </aside>
  );
}
