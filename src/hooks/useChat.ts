"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "@/lib/api/errors";
import { listMessages } from "@/lib/api/messages";
import { streamAIResponse } from "@/lib/api/ai";
import { createChat as apiCreateChat } from "@/lib/api/chats";
import type { ChatMessage } from "@/types/chat";
import type { Chat, Message, WebMode } from "@/types/marijoa";

const MAX_VISIBLE_MESSAGES = 200;
// Fallback flush interval used when requestAnimationFrame is unavailable
// (e.g. headless test environments).
const STREAM_FLUSH_FALLBACK_MS = 33;

function createLocalId(prefix: string): string {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
  return `${prefix}-${random}`;
}

function toChatMessage(message: Message): ChatMessage {
  const role: ChatMessage["role"] =
    message.role === "user" || message.role === "assistant" ? message.role : "assistant";
  return {
    id: message.id,
    role,
    content: message.content,
    timestamp: message.timestamp,
    sources: message.sources,
    webSearchUsed: message.webSearchUsed,
    webMode: message.webMode,
    searchQueries: message.searchQueries,
  };
}

interface UseChatOptions {
  chatId: string | null;
  workspaceId: string | null;
  organizationId?: string;
  onChatCreated?: (chat: Chat) => void;
  onChatActivity?: () => void;
}

export interface UseChatResult {
  messages: ChatMessage[];
  visibleMessages: ChatMessage[];
  isThinking: boolean;
  isLoading: boolean;
  loadError: string | null;
  sendMessage: (content: string, options?: { webMode?: WebMode }) => Promise<void>;
  reload: () => Promise<void>;
  reset: () => void;
}

export function useChat({
  chatId,
  workspaceId,
  organizationId,
  onChatCreated,
  onChatActivity,
}: UseChatOptions): UseChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushFrameRef = useRef<number | null>(null);
  const bufferRef = useRef("");
  const loadRequestId = useRef(0);
  const chatIdRef = useRef<string | null>(chatId);
  chatIdRef.current = chatId;
  // When the user sends their first message in a fresh thread we create the
  // chat on the fly and ask the parent to select it. The parent's selection
  // change re-renders this hook with the new chatId — but the in-flight
  // stream is already populating messages for that exact chat. Without this
  // ref the chatId effect below would cancel the stream and overwrite the
  // optimistic messages with an empty history fetch (Bug 4).
  const activeStreamChatIdRef = useRef<string | null>(null);

  const clearFlushHandles = useCallback(() => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    if (flushFrameRef.current !== null && typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(flushFrameRef.current);
      flushFrameRef.current = null;
    }
  }, []);

  const cancelStream = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    clearFlushHandles();
    bufferRef.current = "";
  }, [clearFlushHandles]);

  const reset = useCallback(() => {
    cancelStream();
    setMessages([]);
    setIsThinking(false);
    setIsLoading(false);
    setLoadError(null);
  }, [cancelStream]);

  // Cleanup on unmount.
  useEffect(() => () => cancelStream(), [cancelStream]);

  const loadHistory = useCallback(
    async (idToLoad: string) => {
      const id = ++loadRequestId.current;
      setIsLoading(true);
      setLoadError(null);
      try {
        const result = await listMessages(idToLoad, { limit: 200 });
        if (loadRequestId.current === id && chatIdRef.current === idToLoad) {
          setMessages(result.items.map(toChatMessage).slice(-MAX_VISIBLE_MESSAGES));
          setIsLoading(false);
        }
      } catch (err) {
        if (loadRequestId.current === id && chatIdRef.current === idToLoad) {
          const message =
            err instanceof ApiError ? err.message : "Could not load chat history.";
          setLoadError(message);
          setIsLoading(false);
        }
      }
    },
    []
  );

  // Reset / load when active chat changes.
  useEffect(() => {
    // If a sendMessage call just created this chat and started streaming into
    // it, ignore the chatId transition — the in-flight stream is already
    // producing the right messages and a history load would race it.
    if (chatId && activeStreamChatIdRef.current === chatId) {
      return;
    }
    cancelStream();
    setLoadError(null);
    if (!chatId) {
      setMessages([]);
      setIsThinking(false);
      setIsLoading(false);
      return;
    }
    setMessages([]);
    setIsThinking(false);
    void loadHistory(chatId);
  }, [chatId, cancelStream, loadHistory]);

  const flushBufferTo = useCallback((assistantId: string, done: boolean) => {
    const buffered = bufferRef.current;
    bufferRef.current = "";
    if (buffered.length === 0 && !done) return;

    setMessages((prev) => {
      const next = prev.map((m) => {
        if (m.id !== assistantId) return m;
        return {
          ...m,
          content: m.content + buffered,
          isStreaming: !done,
        };
      });
      return next.slice(-MAX_VISIBLE_MESSAGES);
    });

    if (done) setIsThinking(false);
  }, []);

  // Flush buffered tokens aligned with the next paint. requestAnimationFrame
  // gives smooth ~60fps updates instead of arbitrary 50ms chunks, which is
  // what makes ChatGPT/Claude streaming feel fluid. We coalesce all tokens
  // that arrive between frames into one setState — heavy markdown trees
  // re-render at most once per frame, not once per token.
  const scheduleFlush = useCallback(
    (assistantId: string) => {
      if (flushFrameRef.current !== null || flushTimerRef.current) return;
      if (typeof requestAnimationFrame === "function") {
        flushFrameRef.current = requestAnimationFrame(() => {
          flushFrameRef.current = null;
          flushBufferTo(assistantId, false);
        });
      } else {
        flushTimerRef.current = setTimeout(() => {
          flushTimerRef.current = null;
          flushBufferTo(assistantId, false);
        }, STREAM_FLUSH_FALLBACK_MS);
      }
    },
    [flushBufferTo]
  );

  const sendMessage = useCallback(
    async (content: string, options: { webMode?: WebMode } = {}) => {
      const trimmed = content.trim();
      if (!trimmed || !workspaceId) return;

      cancelStream();
      setLoadError(null);

      // Resolve a chat: create on first message if necessary.
      let activeChatId = chatIdRef.current;
      if (!activeChatId) {
        try {
          const draftTitle = trimmed.length > 60 ? `${trimmed.slice(0, 57)}...` : trimmed;
          const created = await apiCreateChat({
            workspaceId,
            organizationId,
            title: draftTitle,
          });
          activeChatId = created.id;
          chatIdRef.current = created.id;
          onChatCreated?.(created);
        } catch (err) {
          const message =
            err instanceof ApiError ? err.message : "Could not start a new chat.";
          setLoadError(message);
          return;
        }
      }

      const now = Date.now();
      const userLocalId = createLocalId("user");
      const assistantLocalId = createLocalId("assistant");

      const userMessage: ChatMessage = {
        id: userLocalId,
        role: "user",
        content: trimmed,
        timestamp: now,
      };
      const assistantPlaceholder: ChatMessage = {
        id: assistantLocalId,
        role: "assistant",
        content: "",
        timestamp: now + 1,
        isStreaming: true,
      };

      setMessages((prev) =>
        [...prev, userMessage, assistantPlaceholder].slice(-MAX_VISIBLE_MESSAGES)
      );
      setIsThinking(true);

      const controller = new AbortController();
      abortRef.current = controller;
      // Mark this chatId as actively streaming so the chatId-change effect
      // skips its cancel/reload when the parent selects the just-created
      // chat (see Bug 4 in useChat).
      activeStreamChatIdRef.current = activeChatId;

      const clearActiveStream = () => {
        if (activeStreamChatIdRef.current === activeChatId) {
          activeStreamChatIdRef.current = null;
        }
        abortRef.current = null;
      };

      try {
        await streamAIResponse(activeChatId, trimmed, {
          signal: controller.signal,
          webMode: options.webMode,
          onStart: (payload) => {
            if (!payload.userMessageId) return;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === userLocalId ? { ...m, id: payload.userMessageId } : m
              )
            );
          },
          onWebSearchStart: ({ queries }) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantLocalId
                  ? {
                      ...m,
                      searchStatus: "searching",
                      searchQueries: queries.length > 0 ? queries : m.searchQueries,
                    }
                  : m
              )
            );
          },
          onWebSources: ({ sources }) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantLocalId
                  ? {
                      ...m,
                      sources,
                      searchStatus: "complete",
                      webSearchUsed: sources.length > 0,
                    }
                  : m
              )
            );
          },
          onToken: (chunk) => {
            bufferRef.current += chunk;
            scheduleFlush(assistantLocalId);
          },
          onDone: (payload) => {
            clearFlushHandles();
            flushBufferTo(assistantLocalId, true);
            setMessages((prev) =>
              prev.map((m) => {
                if (m.id !== assistantLocalId) return m;
                const updated: ChatMessage = {
                  ...m,
                  searchStatus: null,
                };
                if (payload.messageId) updated.id = payload.messageId;
                if (payload.webSearchUsed !== undefined) {
                  updated.webSearchUsed = payload.webSearchUsed;
                }
                return updated;
              })
            );
            clearActiveStream();
            onChatActivity?.();
          },
          onError: (payload) => {
            clearFlushHandles();
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantLocalId
                  ? {
                      ...m,
                      content: m.content || `Assistant error: ${payload.message}`,
                      isStreaming: false,
                    }
                  : m
              )
            );
            setIsThinking(false);
            setLoadError(payload.message);
            clearActiveStream();
          },
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          clearActiveStream();
          return;
        }
        const message =
          err instanceof ApiError ? err.message : "AI response failed.";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantLocalId
              ? {
                  ...m,
                  content: m.content || `Assistant error: ${message}`,
                  isStreaming: false,
                }
              : m
          )
        );
        setIsThinking(false);
        setLoadError(message);
        clearActiveStream();
      }
    },
    [
      cancelStream,
      clearFlushHandles,
      flushBufferTo,
      onChatActivity,
      onChatCreated,
      organizationId,
      scheduleFlush,
      workspaceId,
    ]
  );

  const reload = useCallback(async () => {
    if (!chatId) return;
    await loadHistory(chatId);
  }, [chatId, loadHistory]);

  const visibleMessages = useMemo(
    () => messages.slice(-MAX_VISIBLE_MESSAGES),
    [messages]
  );

  return {
    messages,
    visibleMessages,
    isThinking,
    isLoading,
    loadError,
    sendMessage,
    reload,
    reset,
  };
}
