"use client";

import type { ChatHistoryItem } from "@/types/chat";
import { cn } from "@/lib/cn";

interface ChatHistoryListProps {
  items: ChatHistoryItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
}

/**
 * Renders the list of past chat sessions in the sidebar.
 * Text-only, compact rows with ellipsis truncation.
 */
export function ChatHistoryList({
  items,
  activeId,
  onSelect,
}: ChatHistoryListProps) {
  return (
    <nav aria-label="Chat history">
      <ul className="flex flex-col gap-0.5" role="list">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect?.(item.id)}
              title={item.title}
              aria-current={activeId === item.id ? "page" : undefined}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg",
                "text-[13.5px] leading-snug truncate",
                "text-neutral-500 transition-colors duration-150",
                "hover:bg-neutral-200/60 hover:text-neutral-700",
                "focus-ring",
                activeId === item.id && "bg-neutral-200/70 text-neutral-800 font-medium"
              )}
            >
              {item.title}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
