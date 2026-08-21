"use client";

import { memo, useCallback, useId, useState } from "react";
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
  /** Called when the user clicks "Try again" on an error state. */
  onRetry?: () => void;
}

// ---------------------------------------------------------------------------
// ReasoningSummaryDisclosure
// A polished, accessible collapsible that shows a high-level reasoning summary.
// Collapsed by default. Does NOT contain raw chain-of-thought.
// ---------------------------------------------------------------------------

interface ReasoningSummaryDisclosureProps {
  summary: string;
}

function ReasoningSummaryDisclosure({ summary }: ReasoningSummaryDisclosureProps) {
  const [isOpen, setIsOpen] = useState(false);
  const contentId = useId();

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return (
    <div className={styles.reasoningDisclosure}>
      <button
        type="button"
        className={styles.reasoningToggle}
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={toggle}
      >
        <ChevronIcon
          className={`${styles.reasoningChevron} ${isOpen ? styles.reasoningChevronOpen : ""}`}
          size={11}
        />
        <span>Reasoning summary</span>
      </button>
      <div
        id={contentId}
        role="region"
        aria-label="Reasoning summary"
        className={`${styles.reasoningContent} ${isOpen ? styles.reasoningContentOpen : ""}`}
      >
        <p className={styles.reasoningText}>{summary}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MessageErrorState
// Clean user-facing error UI. Never shows raw backend errors or stack traces.
// ---------------------------------------------------------------------------

interface MessageErrorStateProps {
  message: string;
  detail?: string;
  onRetry?: () => void;
}

function MessageErrorStateComponent({ message, detail, onRetry }: MessageErrorStateProps) {
  return (
    <div className={styles.errorState} role="alert" aria-live="assertive">
      <div className={styles.errorStateIcon} aria-hidden="true">
        {/* Simple warning icon inline to avoid an extra import */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      </div>
      <div className={styles.errorStateBody}>
        <p className={styles.errorStateMessage}>{message}</p>
        {detail && <p className={styles.errorStateDetail}>{detail}</p>}
        {onRetry && (
          <button
            type="button"
            className={styles.errorStateRetry}
            onClick={onRetry}
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ThinkingIndicator
// Shown only while streamPhase === "thinking" (before any answer tokens arrive).
// NEVER shows actual internal reasoning.
// ---------------------------------------------------------------------------

function ThinkingIndicator() {
  return (
    <div className={styles.thinkingIndicator} aria-label="Generating answer" role="status">
      <MarijoaMark className={`${styles.thinkingIcon} ${styles.spinning}`} size={16} />
      <span className={styles.thinkingLabel}>Generating answer…</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FinalAnswer
// The primary visible output. Always shown above any secondary content.
// ---------------------------------------------------------------------------

interface FinalAnswerProps {
  content: string;
  isStreaming: boolean;
  isThinkingPhase: boolean;
  sources?: ChatMessageType["sources"];
  searchQueries?: string[];
  searchStatus?: ChatMessageType["searchStatus"];
}

function FinalAnswer({ content, isStreaming, isThinkingPhase, sources, searchQueries, searchStatus }: FinalAnswerProps) {
  return (
    <div className={`${styles.assistantText} ${styles.assistantProse ?? ""}`.trim()}>
      <WebSearchPanel
        sources={sources}
        queries={searchQueries}
        isStreaming={Boolean(isStreaming)}
        isSearching={searchStatus === "searching"}
      />
      {isThinkingPhase ? (
        <ThinkingIndicator />
      ) : content || !isStreaming ? (
        <MarkdownMessage content={content} />
      ) : (
        // Answering phase but buffer not flushed yet — show dots briefly
        <span className={styles.typing} aria-hidden="true">
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ChatMessageComponent
// Top-level assembler following the contract:
//   AssistantMessage
//   ├── FinalAnswer           (primary, always visible)
//   ├── ReasoningSummaryDisclosure  (secondary, collapsed by default)
//   └── MessageErrorState     (only when errorState is set)
// ---------------------------------------------------------------------------

function ChatMessageComponent({
  message,
  onSaveRequest,
  onStartResearch,
  onCancelResearch,
  onExpandResearch,
  onExportResearchPdf,
  onRetry,
}: ChatMessageProps) {
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

  // ── User message ──────────────────────────────────────────────────────────
  if (message.role === "user") {
    return (
      <div className={`${styles.messageRow} ${styles.userRow}`}>
        <div className={styles.userBubble}>{message.content}</div>
      </div>
    );
  }

  // ── Deep research card ─────────────────────────────────────────────────────
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

  // ── Standard assistant message ─────────────────────────────────────────────
  const isThinkingPhase = message.streamPhase === "thinking";
  const hasError = Boolean(message.errorState);

  // Safe reasoning summary: only show if non-empty and there's no active error.
  // reasoningSummary must be a high-level, user-facing text — never raw reasoning.
  const safeReasoningSummary =
    !hasError && message.reasoningSummary && message.reasoningSummary.trim()
      ? message.reasoningSummary.trim()
      : null;

  return (
    <div className={`${styles.messageRow} ${styles.assistantRow}`}>
      <article className={styles.assistantBlock} aria-label="Marijoa response">
        {/* 1. FINAL ANSWER — always primary, always visible */}
        {!hasError && (
          <FinalAnswer
            content={message.content}
            isStreaming={Boolean(message.isStreaming)}
            isThinkingPhase={isThinkingPhase}
            sources={message.sources}
            searchQueries={message.searchQueries}
            searchStatus={message.searchStatus}
          />
        )}

        {/* 2. ERROR STATE — clean UI, never raw errors */}
        {hasError && message.errorState && (
          <MessageErrorStateComponent
            message={message.errorState.message}
            detail={message.errorState.detail}
            onRetry={onRetry}
          />
        )}

        {/* 3. REASONING SUMMARY — secondary, collapsed by default */}
        {safeReasoningSummary && (
          <ReasoningSummaryDisclosure summary={safeReasoningSummary} />
        )}

        {/* 4. MESSAGE ACTIONS — only once response is complete/non-streaming */}
        {!message.isStreaming && !hasError && (
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
        )}
      </article>
    </div>
  );
}

export const ChatMessage = memo(ChatMessageComponent);
