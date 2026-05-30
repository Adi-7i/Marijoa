"use client";

import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ErrorInfo,
  type ReactNode,
} from "react";
import type { ChatMessage as ChatMessageType } from "@/types/chat";
import { APP_NAME, DISCLAIMER_TEXT, USER_GREETING } from "@/lib/constants";
import styles from "@/components/chat/chat-ui.module.css";
import { ArrowDownIcon, MarijoaMark, MenuIcon, ShareIcon } from "@/components/chat/icons";
import { InputBar } from "@/components/chat/InputBar";
import { MessageList } from "@/components/chat/MessageList";

const ESTIMATED_MESSAGE_HEIGHT = 132;
const VIRTUAL_OVERSCAN = 6;

class MessageErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (process.env.NODE_ENV === "development") {
      console.error("[MessageErrorBoundary]", error, info.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      return <p className={styles.errorFallback}>This message could not be rendered.</p>;
    }
    return this.props.children;
  }
}

interface ChatAreaProps {
  messages: ChatMessageType[];
  isThinking: boolean;
  onSend: (message: string) => void;
  onOpenSidebar: () => void;
  onNewChat?: () => void;
}

const suggestions = [
  "Draft a concise project update",
  "Explain this code path",
  "Brainstorm product names",
];

export function ChatArea({ messages, isThinking, onSend, onOpenSidebar, onNewChat }: ChatAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showFab, setShowFab] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const hasMessages = messages.length > 0;
  const shouldVirtualize = messages.length > 50;

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollRef.current;
    if (!el) return;
    if (typeof el.scrollTo === "function") {
      el.scrollTo({ top: el.scrollHeight, behavior });
    } else {
      el.scrollTop = el.scrollHeight;
    }
  }, []);

  const latestMessageContent = messages[messages.length - 1]?.content;

  useEffect(() => {
    scrollToBottom("smooth");
  }, [latestMessageContent, messages.length, scrollToBottom]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowFab(distanceFromBottom > 200);
    setScrollTop(el.scrollTop);
    setViewportHeight(el.clientHeight);
  }, []);

  const virtualState = useMemo(() => {
    if (!shouldVirtualize) {
      return { rendered: messages, offset: 0, height: undefined as number | undefined };
    }

    const start = Math.max(0, Math.floor(scrollTop / ESTIMATED_MESSAGE_HEIGHT) - VIRTUAL_OVERSCAN);
    const visibleCount = Math.ceil((viewportHeight || 720) / ESTIMATED_MESSAGE_HEIGHT) + VIRTUAL_OVERSCAN * 2;
    const end = Math.min(messages.length, start + visibleCount);
    return {
      rendered: messages.slice(start, end),
      offset: start * ESTIMATED_MESSAGE_HEIGHT,
      height: messages.length * ESTIMATED_MESSAGE_HEIGHT,
    };
  }, [messages, scrollTop, shouldVirtualize, viewportHeight]);

  const sendSuggestion = useCallback((text: string) => onSend(text), [onSend]);

  return (
    <section className={styles.chatArea} aria-label="Marijoa chat">
      <header className={styles.header}>
        <button type="button" className={styles.mobileMenu} aria-label="Open sidebar" onClick={onOpenSidebar}>
          <MenuIcon />
        </button>
        <div className={styles.headerTitle}>{APP_NAME}</div>
        <div className={styles.headerRight}>
          <button type="button" className={styles.headerIcon} aria-label="Share or export chat">
            <ShareIcon />
          </button>
        </div>
      </header>

      <div className={styles.screenReaderStatus} aria-live="polite">
        {isThinking ? "Marijoa is thinking..." : ""}
      </div>

      <div ref={scrollRef} className={styles.scrollArea} onScroll={handleScroll} aria-label="Message history">
        {hasMessages ? (
          <MessageErrorBoundary>
            {shouldVirtualize ? (
              <div className={styles.virtualWindow} style={{ height: virtualState.height }}>
                <div className={styles.virtualSlice} style={{ "--virtual-offset": `${virtualState.offset}px` } as CSSProperties}>
                  <MessageList messages={virtualState.rendered} />
                </div>
              </div>
            ) : (
              <MessageList messages={virtualState.rendered} />
            )}
          </MessageErrorBoundary>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyInner}>
              <MarijoaMark className={styles.logoLarge} />
              <h1 className={styles.emptyTitle} aria-label={USER_GREETING}>How can I help you today?</h1>
              <div className={styles.suggestions} aria-label="Suggested prompts">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className={styles.suggestionChip}
                    onClick={() => sendSuggestion(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
              <InputBar onSend={onSend} onAttach={onNewChat} autoFocus />
            </div>
          </div>
        )}
      </div>

      {hasMessages && (
        <div className={styles.inputDock}>
          <InputBar onSend={onSend} onAttach={onNewChat} autoFocus />
          <p className={styles.disclaimer}>{DISCLAIMER_TEXT}</p>
        </div>
      )}

      {showFab && (
        <button type="button" className={styles.fab} aria-label="Scroll to bottom" onClick={() => scrollToBottom("smooth")}>
          <ArrowDownIcon />
        </button>
      )}
    </section>
  );
}
