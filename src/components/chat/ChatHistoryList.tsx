"use client";

import type { ChatHistoryItem } from "@/types/chat";
import styles from "@/components/chat/chat-ui.module.css";

interface ChatHistoryListProps {
  items: ChatHistoryItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
}

function relativeTime(timestamp?: number) {
  if (!timestamp) return "Mon";
  const diff = Date.now() - timestamp;
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;
  if (diff < hour) return "Now";
  if (diff < day) return `${Math.max(1, Math.round(diff / hour))}h ago`;
  if (diff < day * 2) return "Yesterday";
  return new Intl.DateTimeFormat("en", { weekday: "short" }).format(timestamp);
}

export function ChatHistoryList({ items, activeId, onSelect }: ChatHistoryListProps) {
  return (
    <nav aria-label="Chat history">
      <ul className={styles.chatList} role="list">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect?.(item.id)}
              title={item.title}
              aria-current={activeId === item.id ? "page" : undefined}
              className={`${styles.chatItem} ${activeId === item.id ? styles.chatItemActive : ""}`}
            >
              <span className={styles.chatTitle}>{item.title}</span>
              <span className={styles.chatTime}>{relativeTime(item.updatedAt)}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
