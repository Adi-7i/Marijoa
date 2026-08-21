"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChatArea } from "@/components/chat/ChatArea";
import { Notice } from "@/components/ui/Notice";
import { useChat } from "@/hooks/useChat";
import { useDeepResearch } from "@/hooks/useDeepResearch";
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

  // Track the last user message text so the retry button can re-send it.
  const lastUserContentRef = useRef<string>("");

  const {
    messages: deepResearchMessages,
    isDeepResearchMode,
    setDeepResearchMode,
    isBusy: isDeepResearchBusy,
    error: deepResearchError,
    submitResearchQuery,
    startResearch,
    cancelResearch,
    expandResearch,
    closeCanvas,
    exportPdf,
    expandedResearch,
    reset: resetDeepResearch,
  } = useDeepResearch({
    workspaceId,
    chatId: selectedChatId,
    onActivity: onChatActivity,
  });

  // Reset visible messages when AppShell signals a hard reset (mode/workspace change).
  useEffect(() => {
    reset();
    resetDeepResearch();
  }, [resetSignal, reset, resetDeepResearch]);

  const contextSubtitle =
    orgName && workspaceName ? `${orgName} · ${workspaceName}` : workspaceName ?? orgName;

  // User-facing single toggle. On = auto search, Off = never.
  const [webSearchEnabled, setWebSearchEnabled] = useState<boolean>(true);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    setSendError(null);
    resetDeepResearch();
  }, [selectedChatId, workspaceId, resetDeepResearch]);

  const handleSend = (content: string) => {
    setSendError(null);
    if (isDeepResearchMode) {
      void submitResearchQuery(content);
      return;
    }
    if (!workspaceId) {
      setSendError("Select or create a workspace first.");
      return;
    }
    lastUserContentRef.current = content;
    void sendMessage(content, { webMode: webSearchEnabled ? "auto" : "off" });
  };

  /** Re-send the last user message. Used by the error state "Try again" button. */
  const handleRetry = useCallback(() => {
    const content = lastUserContentRef.current;
    if (!content || !workspaceId) return;
    setSendError(null);
    void sendMessage(content, { webMode: webSearchEnabled ? "auto" : "off" });
  }, [sendMessage, webSearchEnabled, workspaceId]);

  const allMessages = [...visibleMessages, ...deepResearchMessages].sort(
    (a, b) => a.timestamp - b.timestamp
  );

  return (
    <main aria-label="Chat panel" className={`${styles.main} ${className ?? ""}`}>
      {loadError && (
        <div style={{ padding: "8px 16px 0" }}>
          <Notice>
            <span role="alert">{loadError}</span>
          </Notice>
        </div>
      )}
      {sendError && (
        <div style={{ padding: "8px 16px 0" }}>
          <Notice>
            <span role="alert">{sendError}</span>
          </Notice>
        </div>
      )}
      {deepResearchError && (
        <div style={{ padding: "8px 16px 0" }}>
          <Notice>
            <span role="alert">{deepResearchError}</span>
          </Notice>
        </div>
      )}
      <ChatArea
        messages={allMessages}
        isThinking={isThinking || isLoading || isDeepResearchBusy}
        onSend={handleSend}
        onAttach={onOpenFiles}
        onOpenSidebar={onOpenSidebar ?? (() => undefined)}
        chatTitle={chatTitle}
        contextSubtitle={contextSubtitle}
        rightPanelOpen={rightPanelOpen}
        onToggleRightPanel={onToggleRightPanel}
        onSaveAsArtifact={onSaveAsArtifact}
        webSearchEnabled={webSearchEnabled}
        onWebSearchToggle={setWebSearchEnabled}
        deepResearchEnabled={isDeepResearchMode}
        onDeepResearchToggle={setDeepResearchMode}
        onStartResearch={startResearch}
        onCancelResearch={cancelResearch}
        onExpandResearch={expandResearch}
        onCloseResearchCanvas={closeCanvas}
        onExportResearchPdf={exportPdf}
        expandedResearch={expandedResearch}
        onRetry={handleRetry}
      />
    </main>
  );
}
