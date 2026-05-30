import type { ChatMessage } from "@/types/chat";
import { cn } from "@/lib/cn";

interface MessageListProps {
  messages: ChatMessage[];
}

/**
 * Renders the chat message thread.
 * - User messages: right-aligned rounded bubble.
 * - Assistant messages: left-aligned plain text block.
 *
 * TODO: Replace demo rendering with real streaming response when backend is ready.
 */
export function MessageList({ messages }: MessageListProps) {
  if (messages.length === 0) return null;

  return (
    <div
      role="log"
      aria-label="Chat messages"
      aria-live="polite"
      className="flex flex-col gap-6 w-full max-w-[720px] mx-auto px-2"
    >
      {messages.map((msg) =>
        msg.role === "user" ? (
          <UserMessage key={msg.id} content={msg.content} />
        ) : (
          <AssistantMessage key={msg.id} content={msg.content} />
        )
      )}
    </div>
  );
}

/* ── User message bubble ─────────────────────────────────── */
function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div
        className={cn(
          "max-w-[72%] px-4 py-2.5 rounded-[18px] rounded-tr-md",
          "bg-neutral-100 text-neutral-800",
          "text-[14px] leading-relaxed"
        )}
      >
        {content}
      </div>
    </div>
  );
}

/* ── Assistant message block ─────────────────────────────── */
function AssistantMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-start gap-3">
      {/* Small assistant icon */}
      <div
        className={cn(
          "flex-shrink-0 w-7 h-7 rounded-full mt-0.5",
          "bg-neutral-800/90 flex items-center justify-center"
        )}
        aria-hidden="true"
      >
        {/* Same SVG mark as sidebar logo */}
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <circle cx="4" cy="6" r="2.5" fill="white" fillOpacity="1" />
          <circle cx="9" cy="6" r="1.6" fill="white" fillOpacity="0.5" />
        </svg>
      </div>

      <div className="flex flex-col gap-1 max-w-[84%]">
        <span className="text-[11px] font-medium text-neutral-400 select-none">
          Marijoa
        </span>
        <p className="text-[14px] leading-relaxed text-neutral-700">{content}</p>
      </div>
    </div>
  );
}
