"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEMO_ASSISTANT_RESPONSE } from "@/lib/constants";
import type { ChatMessage } from "@/types/chat";

const STREAM_FLUSH_MS = 50;
const MAX_VISIBLE_MESSAGES = 100;

const DEMO_THOUGHTS =
  "I am identifying the user's intent, checking the current chat context, and composing a direct answer with the smallest useful amount of detail.";

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function splitChunks(text: string) {
  return text.match(/.{1,12}(\s|$)/g)?.map((chunk) => chunk.trimStart()) ?? [text];
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const bufferRef = useRef("");

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current = [];
    bufferRef.current = "";
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const reset = useCallback(() => {
    clearTimers();
    setIsThinking(false);
    setMessages([]);
  }, [clearTimers]);

  const flushBuffer = useCallback((assistantId: string, done = false) => {
    const buffered = bufferRef.current;
    bufferRef.current = "";

    setMessages((prev) => {
      const next = prev.map((message) => {
        if (message.id !== assistantId) return message;
        return {
          ...message,
          content: message.content + buffered,
          isStreaming: !done,
        };
      });
      return next.slice(-MAX_VISIBLE_MESSAGES);
    });

    if (done) setIsThinking(false);
  }, []);

  const streamAssistantReply = useCallback(
    (assistantId: string) => {
      const chunks = splitChunks(DEMO_ASSISTANT_RESPONSE);
      let elapsed = 260;
      let sinceFlush = 0;

      chunks.forEach((chunk, index) => {
        elapsed += 24;
        sinceFlush += 24;

        timersRef.current.push(
          setTimeout(() => {
            bufferRef.current += chunk;
            const shouldFlush = sinceFlush >= STREAM_FLUSH_MS || index === chunks.length - 1;
            if (shouldFlush) {
              sinceFlush = 0;
              flushBuffer(assistantId, index === chunks.length - 1);
            }
          }, elapsed)
        );
      });
    },
    [flushBuffer]
  );

  const sendMessage = useCallback(
    (content: string) => {
      const trimmed = content.trim();
      if (!trimmed) return;

      clearTimers();
      const now = Date.now();
      const assistantId = createId("assistant");
      const userMessage: ChatMessage = {
        id: createId("user"),
        role: "user",
        content: trimmed,
        timestamp: now,
      };
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: now + 1,
        thoughts: DEMO_THOUGHTS,
        isStreaming: true,
      };

      setIsThinking(true);
      setMessages((prev) => [...prev, userMessage, assistantMessage].slice(-MAX_VISIBLE_MESSAGES));
      streamAssistantReply(assistantId);
    },
    [clearTimers, streamAssistantReply]
  );

  const visibleMessages = useMemo(() => messages.slice(-MAX_VISIBLE_MESSAGES), [messages]);

  return {
    messages,
    visibleMessages,
    isThinking,
    sendMessage,
    reset,
  };
}
