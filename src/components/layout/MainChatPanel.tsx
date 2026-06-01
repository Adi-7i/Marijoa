"use client";

import { useEffect, useRef } from "react";
import { ChatArea } from "@/components/chat/ChatArea";
import { useChat } from "@/hooks/useChat";
import type { ChatMessage } from "@/types/chat";
import type { AppMode, ArtifactType } from "@/types/marijoa";
import styles from "@/components/chat/chat-ui.module.css";

interface MainChatPanelProps {
  onOpenSidebar?: () => void;
  resetSignal?: number;
  className?: string;
  selectedChatId?: string | null;
  initialMessages?: ChatMessage[];
  chatTitle?: string;
  workspaceName?: string;
  orgName?: string;
  mode?: AppMode;
  rightPanelOpen?: boolean;
  onToggleRightPanel?: () => void;
  onSaveAsArtifact?: (title: string, type: ArtifactType, content: string) => void;
}

export function MainChatPanel({
  onOpenSidebar,
  resetSignal = 0,
  className,
  selectedChatId = null,
  initialMessages,
  chatTitle,
  workspaceName,
  orgName,
  rightPanelOpen = false,
  onToggleRightPanel,
  onSaveAsArtifact,
}: MainChatPanelProps) {
  const { visibleMessages, isThinking, sendMessage, reset, resetTo } = useChat();
  const lastResetSignal = useRef(resetSignal);
  const lastChatId = useRef(selectedChatId);

  useEffect(() => {
    if (resetSignal !== lastResetSignal.current) {
      lastResetSignal.current = resetSignal;
      reset();
    }
  }, [reset, resetSignal]);

  useEffect(() => {
    if (selectedChatId !== lastChatId.current) {
      lastChatId.current = selectedChatId;
      if (initialMessages && initialMessages.length > 0) {
        resetTo(initialMessages);
      } else {
        reset();
      }
    }
  }, [initialMessages, reset, resetTo, selectedChatId]);

  const contextSubtitle =
    orgName && workspaceName ? `${orgName} · ${workspaceName}` : workspaceName ?? orgName;

  return (
    <main aria-label="Chat panel" className={`${styles.main} ${className ?? ""}`}>
      <ChatArea
        messages={visibleMessages}
        isThinking={isThinking}
        onSend={sendMessage}
        onNewChat={reset}
        onOpenSidebar={onOpenSidebar ?? (() => undefined)}
        chatTitle={chatTitle}
        contextSubtitle={contextSubtitle}
        rightPanelOpen={rightPanelOpen}
        onToggleRightPanel={onToggleRightPanel}
        onSaveAsArtifact={onSaveAsArtifact}
      />
    </main>
  );
}
