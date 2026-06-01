"use client";

import { API_BASE_URL } from "./config";
import { ApiError } from "./errors";
import { apiClient } from "./client";
import { clearTokens, getAccessToken } from "@/lib/auth/token-store";
import { readSSEStream, type SSEEvent } from "@/lib/sse/parse-sse";
import { adaptMessage } from "./adapters";
import type { AIRespondRequest, AIRespondResponse } from "./types";
import type { Message } from "@/types/marijoa";

export interface AIRespondResult {
  userMessage: Message;
  assistantMessage: Message;
}

export async function aiRespond(chatId: string, content: string): Promise<AIRespondResult> {
  const body: AIRespondRequest = { content };
  const payload = await apiClient.post<AIRespondResponse>(`/chats/${chatId}/ai/respond`, {
    json: body,
  });
  return {
    userMessage: adaptMessage(payload.user_message),
    assistantMessage: adaptMessage(payload.assistant_message),
  };
}

// --- Streaming --------------------------------------------------------------

export interface AIStreamStartPayload {
  chatId: string;
  userMessageId: string;
}

export interface AIStreamDonePayload {
  chatId: string;
  messageId: string | null;
}

export interface AIStreamErrorPayload {
  code: string;
  message: string;
}

export interface AIStreamHandlers {
  onStart?: (payload: AIStreamStartPayload) => void;
  onToken?: (content: string) => void;
  onDone?: (payload: AIStreamDonePayload) => void;
  onError?: (payload: AIStreamErrorPayload) => void;
}

export interface AIStreamOptions extends AIStreamHandlers {
  signal?: AbortSignal;
}

function safeJsonParse(text: string): Record<string, unknown> | null {
  if (!text) return null;
  try {
    const parsed = JSON.parse(text);
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function dispatchEvent(event: SSEEvent, handlers: AIStreamHandlers): boolean {
  const data = safeJsonParse(event.data) ?? {};
  switch (event.event) {
    case "start": {
      handlers.onStart?.({
        chatId: String(data.chat_id ?? ""),
        userMessageId: String(data.user_message_id ?? ""),
      });
      return false;
    }
    case "token": {
      const content = typeof data.content === "string" ? data.content : "";
      handlers.onToken?.(content);
      return false;
    }
    case "done": {
      const messageId = data.message_id == null ? null : String(data.message_id);
      handlers.onDone?.({
        chatId: String(data.chat_id ?? ""),
        messageId,
      });
      return true;
    }
    case "error": {
      handlers.onError?.({
        code: String(data.code ?? "AI_PROVIDER_ERROR"),
        message: String(data.message ?? "AI provider error."),
      });
      return true;
    }
    default:
      return false;
  }
}

export async function streamAIResponse(
  chatId: string,
  content: string,
  options: AIStreamOptions = {}
): Promise<void> {
  const { signal, ...handlers } = options;

  const token = getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/chats/${chatId}/ai/stream`, {
      method: "POST",
      headers,
      body: JSON.stringify({ content } satisfies AIRespondRequest),
      signal,
      credentials: "omit",
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError({
      status: 0,
      code: "NETWORK_ERROR",
      message: "Could not reach the Marijoa backend.",
      isNetworkError: true,
    });
  }

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      // ignore — non-JSON error body
    }
    const envelope =
      body && typeof body === "object"
        ? ((body as { error?: { code?: string; message?: string } }).error ?? null)
        : null;
    if (response.status === 401) {
      clearTokens();
    }
    throw new ApiError({
      status: response.status,
      code: envelope?.code ?? `HTTP_${response.status}`,
      message: envelope?.message ?? response.statusText ?? "AI stream failed.",
    });
  }

  let terminated = false;
  await readSSEStream(
    response,
    (event) => {
      if (terminated) return;
      terminated = dispatchEvent(event, handlers);
    },
    { signal }
  );
}
