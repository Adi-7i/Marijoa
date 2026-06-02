"use client";

import { memo, useCallback, useState } from "react";
import type { ChatMessage as ChatMessageType } from "@/types/chat";
import styles from "@/components/chat/chat-ui.module.css";
import {
  BookmarkIcon,
  CheckIcon,
  ChevronIcon,
  CopyIcon,
  MarijoaMark,
  MoreIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
} from "@/components/chat/icons";
import { MarkdownMessage } from "@/components/chat/MarkdownMessage";
import { ResearchMessage } from "@/components/deep-research/ResearchMessage";
import { WebSearchPanel } from "@/components/chat/WebSearchPanel";

interface ChatMessageProps {
  message: ChatMessageType;
  onSaveRequest?: (message: ChatMessageType) => void;
  onStartResearch?: (sessionId: string) => void;
  onCancelResearch?: (sessionId: string) => void;
  onExpandResearch?: (sessionId: string) => void;
  onExportResearchPdf?: (sessionId: string) => void;
}

function ChatMessageComponent({
  message,
  onSaveRequest,
  onStartResearch,
  onCancelResearch,
  onExpandResearch,
  onExportResearchPdf,
}: ChatMessageProps) {
  const [thoughtsOpen, setThoughtsOpen] = useState(Boolean(message.isStreaming));
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard?.writeText(message.content);
    } catch {
      // Clipboard access can be unavailable in tests or non-secure contexts.
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }, [message.content]);

  if (message.role === "user") {
    return (
      <div className={`${styles.messageRow} ${styles.userRow}`}>
        <div className={styles.userBubble}>{message.content}</div>
      </div>
    );
  }

  if (message.kind === "deep_research" && message.research) {
    return (
      <div className={`${styles.messageRow} ${styles.assistantRow}`}>
        <article className={styles.assistantBlock} aria-label="Deep Research">
          <ResearchMessage
            research={message.research}
            onStart={onStartResearch ?? (() => undefined)}
            onCancel={onCancelResearch ?? (() => undefined)}
            onExpand={onExpandResearch ?? (() => undefined)}
            onExportPdf={onExportResearchPdf ?? (() => undefined)}
          />
        </article>
      </div>
    );
  }

  return (
    <div className={`${styles.messageRow} ${styles.assistantRow}`}>
      <article className={styles.assistantBlock} aria-label="Marijoa response">
        <button
          type="button"
          className={styles.thoughtToggle}
          onClick={() => setThoughtsOpen((open) => !open)}
          aria-expanded={thoughtsOpen}
        >
          <MarijoaMark className={`${styles.thoughtIcon} ${message.isStreaming ? styles.spinning : ""}`} />
          <span>Thoughts</span>
          <ChevronIcon className={`${styles.chevron} ${thoughtsOpen ? styles.chevronOpen : ""}`} />
        </button>
        <div className={`${styles.thoughtContent} ${thoughtsOpen ? styles.thoughtExpanded : ""}`}>
          {message.thoughts}
        </div>

        <div className={`${styles.assistantText} ${styles.assistantProse ?? ""}`.trim()}>
          <WebSearchPanel
            sources={message.sources}
            queries={message.searchQueries}
            isStreaming={Boolean(message.isStreaming)}
            isSearching={message.searchStatus === "searching"}
          />
          {message.content || !message.isStreaming ? (
            <MarkdownMessage content={message.content} />
          ) : (
            <span className={styles.typing} aria-hidden="true">
              <span className={styles.dot} />
              <span className={styles.dot} />
              <span className={styles.dot} />
            </span>
          )}
        </div>

        <div className={styles.actions} aria-label="Message actions">
          <button
            type="button"
            className={`${styles.messageAction} ${copied ? styles.copyDone : ""}`}
            aria-label={copied ? "Copied" : "Copy response"}
            onClick={copy}
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </button>
          {onSaveRequest && (
            <button
              type="button"
              className={styles.messageAction}
              aria-label="Save as artifact"
              title="Save as artifact"
              onClick={() => onSaveRequest(message)}
            >
              <BookmarkIcon size={14} />
            </button>
          )}
          <button type="button" className={styles.messageAction} aria-label="Good response">
            <ThumbsUpIcon />
          </button>
          <button type="button" className={styles.messageAction} aria-label="Bad response">
            <ThumbsDownIcon />
          </button>
          <button type="button" className={styles.messageAction} aria-label="More actions">
            <MoreIcon />
          </button>
        </div>
      </article>
    </div>
  );
}

export const ChatMessage = memo(ChatMessageComponent);
