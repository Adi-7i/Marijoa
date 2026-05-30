import { useRef, useEffect } from "react";
import { MessageList } from "@/components/chat/MessageList";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { DISCLAIMER_TEXT } from "@/lib/constants";
import type { ChatMessage } from "@/types/chat";
import { cn } from "@/lib/cn";

interface ActiveChatStateProps {
  messages: ChatMessage[];
  onSend: (message: string) => void;
  onReset?: () => void;
}

/**
 * Active chat screen — scrollable message list + bottom-pinned composer.
 *
 * Layout:
 *   ┌──────────────────────────────────────────┐
 *   │  [messages scroll area — flex-1]         │
 *   │                                          │
 *   │  ─────────────────────────────────────   │
 *   │  [composer — bottom, centered]           │
 *   │  [disclaimer text]                       │
 *   └──────────────────────────────────────────┘
 *
 * TODO: Replace onSend demo logic with real API streaming when backend is ready.
 */
export function ActiveChatState({
  messages,
  onSend,
  onReset,
}: ActiveChatStateProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* ── Scrollable message area ────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 py-6"
        aria-label="Message history"
      >
        <MessageList messages={messages} />
      </div>

      {/* ── Bottom composer bar ─────────────────────────── */}
      <div
        className={cn(
          "flex-shrink-0 flex flex-col items-center",
          "px-6 pb-5 pt-2"
        )}
      >
        <ChatComposer
          onSend={onSend}
          onReset={onReset}
          isBottomBar
          autoFocus
          className="w-full"
        />

        {/* Disclaimer */}
        <p className="mt-2.5 text-[11px] text-neutral-400 text-center select-none max-w-[560px]">
          {DISCLAIMER_TEXT}
        </p>
      </div>
    </div>
  );
}
