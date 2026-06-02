"use client";

import { useEffect } from "react";
import { ChatArea } from "@/components/chat/ChatArea";
import { Notice } from "@/components/ui/Notice";
import { useChat } from "@/hooks/useChat";
import type { AppMode, ArtifactType, Chat } from "@/types/marijoa";
import styles from "@/components/chat/chat-ui.module.css";

interface MainChatPanelProps {
  onOpenSidebar?: () => void;
  resetSignal?: number;
  className?: string;
  selectedChatId?: string | null;
  workspaceId?: string | null;
  organizationId?: string;
  chatTitle?: string;
  workspaceName?: string;
  orgName?: string;
  mode?: AppMode;
  rightPanelOpen?: boolean;
  onToggleRightPanel?: () => void;
  onOpenFiles?: () => void;
  onSaveAsArtifact?: (title: string, type: ArtifactType, content: string) => void;
  onChatCreated?: (chat: Chat) => void;
  onChatActivity?: () => void;
}

export function MainChatPanel({
  onOpenSidebar,
  resetSignal = 0,
  className,
  selectedChatId = null,
  workspaceId = null,
  organizationId,
  chatTitle,
  workspaceName,
  orgName,
  rightPanelOpen = false,
  onToggleRightPanel,
  onOpenFiles,
  onSaveAsArtifact,
  onChatCreated,
  onChatActivity,
}: MainChatPanelProps) {
  const {
    visibleMessages,
    isThinking,
    isLoading,
    loadError,
    sendMessage,
    reset,
  } = useChat({
    chatId: selectedChatId,
    workspaceId,
    organizationId,
    onChatCreated,
    onChatActivity,
  });

  // Reset visible messages when AppShell signals a hard reset (mode/workspace change).
  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal]);

  const contextSubtitle =
    orgName && workspaceName ? `${orgName} · ${workspaceName}` : workspaceName ?? orgName;

  const handleSend = (content: string) => {
    if (!workspaceId) return;
    void sendMessage(content);
  };

  return (
    <main aria-label="Chat panel" className={`${styles.main} ${className ?? ""}`}>
      {loadError && (
        <div style={{ padding: "8px 16px 0" }}>
          <Notice>
            <span role="alert">{loadError}</span>
          </Notice>
        </div>
      )}
      <ChatArea
        messages={visibleMessages}
        isThinking={isThinking || isLoading}
        onSend={handleSend}
        onAttach={onOpenFiles}
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
