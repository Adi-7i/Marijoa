"use client";

import { useEffect, useRef } from "react";
import { ChatArea } from "@/components/chat/ChatArea";
import { useChat } from "@/hooks/useChat";
import styles from "@/components/chat/chat-ui.module.css";

interface MainChatPanelProps {
  onExternalReset?: () => void;
  onOpenSidebar?: () => void;
  resetSignal?: number;
  className?: string;
}

export function MainChatPanel({ onOpenSidebar, resetSignal = 0, className }: MainChatPanelProps) {
  const { visibleMessages, isThinking, sendMessage, reset } = useChat();
  const lastResetSignal = useRef(resetSignal);

  useEffect(() => {
    if (resetSignal !== lastResetSignal.current) {
      lastResetSignal.current = resetSignal;
      reset();
    }
  }, [reset, resetSignal]);

  return (
    <main aria-label="Chat panel" className={`${styles.main} ${className ?? ""}`}>
      <ChatArea
        messages={visibleMessages}
        isThinking={isThinking}
        onSend={sendMessage}
        onNewChat={reset}
        onOpenSidebar={onOpenSidebar ?? (() => undefined)}
      />
    </main>
  );
}
