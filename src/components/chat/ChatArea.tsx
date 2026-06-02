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
import type { ArtifactType } from "@/types/marijoa";
import { APP_NAME, DISCLAIMER_TEXT, USER_GREETING } from "@/lib/constants";
import styles from "@/components/chat/chat-ui.module.css";
import { ArrowDownIcon, MarijoaMark, MenuIcon, PanelRightIcon, ShareIcon } from "@/components/chat/icons";
import { InputBar } from "@/components/chat/InputBar";
import { MessageList } from "@/components/chat/MessageList";
import { SaveAsArtifactModal } from "@/components/artifacts/SaveAsArtifactModal";

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
  /**
   * Plus / paperclip button in the composer. Should open the file upload UI
   * (right panel Files tab). Intentionally NOT wired to "new chat" or "reset
   * chat" — the composer must never reset the active chat or workspace.
   */
  onAttach?: () => void;
  chatTitle?: string;
  contextSubtitle?: string;
  rightPanelOpen?: boolean;
  onToggleRightPanel?: () => void;
  onSaveAsArtifact?: (title: string, type: ArtifactType, content: string) => void;
  webSearchEnabled?: boolean;
  onWebSearchToggle?: (next: boolean) => void;
}

interface PromptSuggestion {
  label: string;
  prompt: string;
}

const suggestions: PromptSuggestion[] = [
  {
    label: "Draft a concise project update",
    prompt:
      "Draft a concise, professional project update for a team or client. Include a short summary, completed work, current progress, blockers, and next steps. If exact details are missing, create a realistic generic version instead of filling the answer with placeholders.",
  },
  {
    label: "Explain this code path",
    prompt:
      "Explain this code path in simple, practical terms. Start with a short overview, then describe the flow step by step, and end with possible risks or things to check.",
  },
  {
    label: "Brainstorm product names",
    prompt:
      "Brainstorm strong product names with short reasoning. Group them by style — premium, technical, friendly, and enterprise. Keep the list practical and brandable.",
  },
  {
    label: "Compare two options",
    prompt:
      "Compare the two options I describe and recommend the best one. Use a structured comparison and end with a clear recommendation.",
  },
];

export function ChatArea({
  messages,
  isThinking,
  onSend,
  onOpenSidebar,
  onAttach,
  chatTitle,
  contextSubtitle,
  rightPanelOpen = false,
  onToggleRightPanel,
  onSaveAsArtifact,
  webSearchEnabled,
  onWebSearchToggle,
}: ChatAreaProps) {
  const [saveMessage, setSaveMessage] = useState<ChatMessageType | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showFab, setShowFab] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  // True when the user is parked near the bottom — keep auto-scrolling.
  // False when they have scrolled up to read — leave them alone so streaming
  // never yanks them away from the content they're reading.
  const stickToBottomRef = useRef(true);
  // Throttle auto-scroll to one call per frame so streaming tokens cannot
  // schedule dozens of scrolls per second.
  const scrollFrameRef = useRef<number | null>(null);
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

  const requestScrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      if (scrollFrameRef.current !== null) return;
      const schedule =
        typeof requestAnimationFrame === "function"
          ? requestAnimationFrame
          : (cb: FrameRequestCallback) => window.setTimeout(() => cb(0), 16);
      scrollFrameRef.current = schedule(() => {
        scrollFrameRef.current = null;
        scrollToBottom(behavior);
      }) as unknown as number;
    },
    [scrollToBottom]
  );

  const latestMessageContent = messages[messages.length - 1]?.content;

  useEffect(() => {
    if (!stickToBottomRef.current) return;
    requestScrollToBottom("smooth");
  }, [latestMessageContent, messages.length, requestScrollToBottom]);

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current !== null && typeof cancelAnimationFrame === "function") {
        cancelAnimationFrame(scrollFrameRef.current);
      }
    };
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 80;
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
        <div className={styles.headerCenter}>
          <div className={styles.headerTitle}>{chatTitle ?? APP_NAME}</div>
          {contextSubtitle && (
            <div className={styles.headerSubtitle}>{contextSubtitle}</div>
          )}
        </div>
        <div className={styles.headerRight}>
          {onToggleRightPanel && (
            <button
              type="button"
              className={styles.headerIcon}
              aria-label={rightPanelOpen ? "Close panel" : "Open panel"}
              aria-pressed={rightPanelOpen}
              onClick={onToggleRightPanel}
            >
              <PanelRightIcon size={18} />
            </button>
          )}
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
                  <MessageList
                    messages={virtualState.rendered}
                    onSaveRequest={onSaveAsArtifact ? setSaveMessage : undefined}
                  />
                </div>
              </div>
            ) : (
              <MessageList
                messages={virtualState.rendered}
                onSaveRequest={onSaveAsArtifact ? setSaveMessage : undefined}
              />
            )}
          </MessageErrorBoundary>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyInner}>
              <MarijoaMark className={styles.logoLarge} />
              <h1 className={styles.emptyTitle} aria-label={USER_GREETING}>
                How can I help you today?
              </h1>
              <div className={styles.suggestions} aria-label="Suggested prompts">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.label}
                    type="button"
                    className={styles.suggestionChip}
                    onClick={() => sendSuggestion(suggestion.prompt)}
                    title={suggestion.label}
                  >
                    {suggestion.label}
                  </button>
                ))}
              </div>
              <InputBar
                onSend={onSend}
                onAttach={onAttach}
                autoFocus
                webSearchEnabled={webSearchEnabled}
                onWebSearchToggle={onWebSearchToggle}
              />
            </div>
          </div>
        )}
      </div>

      {hasMessages && (
        <div className={styles.inputDock}>
          <InputBar
            onSend={onSend}
            onAttach={onAttach}
            autoFocus
            webSearchEnabled={webSearchEnabled}
            onWebSearchToggle={onWebSearchToggle}
          />
          <p className={styles.disclaimer}>{DISCLAIMER_TEXT}</p>
        </div>
      )}

      {showFab && (
        <button
          type="button"
          className={styles.fab}
          aria-label="Scroll to bottom"
          onClick={() => {
            stickToBottomRef.current = true;
            scrollToBottom("smooth");
          }}
        >
          <ArrowDownIcon />
        </button>
      )}

      {saveMessage && onSaveAsArtifact && (
        <SaveAsArtifactModal
          message={saveMessage}
          onConfirm={(title, type) => {
            onSaveAsArtifact(title, type, saveMessage.content);
            setSaveMessage(null);
          }}
          onCancel={() => setSaveMessage(null)}
        />
      )}
    </section>
  );
}
