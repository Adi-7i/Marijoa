"use client";

import { memo, useCallback, useMemo, useState, type ReactNode } from "react";
import type { ChatMessage as ChatMessageType } from "@/types/chat";
import styles from "@/components/chat/chat-ui.module.css";
import {
  CheckIcon,
  ChevronIcon,
  CopyIcon,
  MarijoaMark,
  MoreIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
} from "@/components/chat/icons";

interface ChatMessageProps {
  message: ChatMessageType;
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${match.index}`;
    if (token.startsWith("`")) {
      nodes.push(<code key={key} className={styles.inlineCode}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith("**")) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    }
    cursor = match.index + token.length;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

function MarkdownText({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  const blocks = useMemo(() => {
    const parts = content.split(/```/g);
    return parts.map((part, index) => ({ type: index % 2 === 1 ? "code" : "text", value: part }));
  }, [content]);

  if (!content && isStreaming) {
    return (
      <span className={styles.typing} aria-hidden="true">
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </span>
    );
  }

  return (
    <>
      {blocks.map((block, blockIndex) => {
        if (block.type === "code") {
          return <pre key={blockIndex} className={styles.codeBlock}><code>{block.value.trim()}</code></pre>;
        }

        return block.value.split(/\n{2,}/g).filter(Boolean).map((paragraph, paragraphIndex) => (
          <p key={`${blockIndex}-${paragraphIndex}`}>
            {renderInline(paragraph, `${blockIndex}-${paragraphIndex}`)}
          </p>
        ));
      })}
    </>
  );
}

function ChatMessageComponent({ message }: ChatMessageProps) {
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

        <div className={styles.assistantText}>
          <MarkdownText content={message.content} isStreaming={message.isStreaming} />
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
