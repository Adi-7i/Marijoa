import type { CSSProperties } from "react";
import type { ChatMessage as ChatMessageType } from "@/types/chat";
import { ChatMessage } from "@/components/chat/ChatMessage";
import styles from "@/components/chat/chat-ui.module.css";

interface MessageListProps {
  messages: ChatMessageType[];
  virtualOffset?: number;
  onSaveRequest?: (message: ChatMessageType) => void;
}

export function MessageList({ messages, virtualOffset = 0, onSaveRequest }: MessageListProps) {
  if (messages.length === 0) return null;

  return (
    <div
      role="log"
      aria-label="Chat messages"
      aria-live="polite"
      className={styles.messagesInner}
      style={{ "--virtual-offset": `${virtualOffset}px` } as CSSProperties}
    >
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} onSaveRequest={onSaveRequest} />
      ))}
    </div>
  );
}
