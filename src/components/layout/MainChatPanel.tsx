"use client";

import { useState, useCallback } from "react";
import { APP_NAME, DEMO_ASSISTANT_RESPONSE } from "@/lib/constants";
import { EmptyChatState } from "@/components/chat/EmptyChatState";
import { ActiveChatState } from "@/components/chat/ActiveChatState";
import { cn } from "@/lib/cn";
import type { ChatMessage } from "@/types/chat";

interface MainChatPanelProps {
  /** Called when a New Chat is triggered from outside (e.g. sidebar button) */
  onExternalReset?: () => void;
  className?: string;
}

/**
 * Main white rounded-rectangle chat canvas.
 *
 * Two states:
 *   1. Empty  — greeting + centered composer
 *   2. Active — scrollable messages + bottom composer
 *
 * Demo behavior: on submit, adds user bubble then a hardcoded assistant reply.
 * TODO: Replace DEMO_ASSISTANT_RESPONSE with real streaming API call.
 */
export function MainChatPanel({ onExternalReset, className }: MainChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const hasMessages = messages.length > 0;

  /* ── Handle message send ──────────────────────────────── */
  const handleSend = useCallback((text: string) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: Date.now(),
    };

    // ── DEMO: hardcoded assistant reply ──
    // TODO: Remove this block and call real API when backend is ready.
    const assistantMsg: ChatMessage = {
      id: `assistant-${Date.now() + 1}`,
      role: "assistant",
      content: DEMO_ASSISTANT_RESPONSE,
      timestamp: Date.now() + 1,
    };
    // ── END DEMO ──────────────────────────

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
  }, []);

  /* ── Reset to empty state ─────────────────────────────── */
  const handleReset = useCallback(() => {
    setMessages([]);
    onExternalReset?.();
  }, [onExternalReset]);

  return (
    <main
      aria-label="Chat panel"
      className={cn(
        "relative flex flex-col min-w-0 overflow-hidden",
        "bg-white",
        "border border-[rgba(0,0,0,0.05)]",
        className
      )}
      style={{
        borderRadius: "var(--radius-panel)",
        boxShadow: "var(--shadow-panel)",
      }}
    >
      {/* ── Brand wordmark — top left ─────────────────── */}
      <div
        className="absolute top-[22px] left-[26px] select-none z-10"
        aria-hidden="true"
      >
        <span
          className={cn(
            "text-[25px] font-extrabold text-neutral-900",
            "tracking-[-0.04em] leading-none"
          )}
        >
          {APP_NAME}
        </span>
      </div>

      {/* ── Content area ─────────────────────────────────── */}
      {hasMessages ? (
        /* Active chat state — messages + bottom composer */
        <div className="flex flex-col flex-1 min-h-0 pt-[68px]">
          <ActiveChatState
            messages={messages}
            onSend={handleSend}
            onReset={handleReset}
          />
        </div>
      ) : (
        /* Empty state — greeting + centered composer */
        <div className="flex flex-col flex-1 min-h-0 pt-[68px]">
          <EmptyChatState onSend={handleSend} onReset={handleReset} />
        </div>
      )}
    </main>
  );
}
