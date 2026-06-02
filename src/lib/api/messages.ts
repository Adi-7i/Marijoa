"use client";

import { apiClient } from "./client";
import { adaptMessage } from "./adapters";
import type { MessageCreateRequest, MessageRead, MessagesListResponse } from "./types";
import type { Message } from "@/types/marijoa";

export async function listMessages(
  chatId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{ items: Message[]; total: number }> {
  const payload = await apiClient.get<MessagesListResponse>(`/chats/${chatId}/messages`, {
    query: { limit: options.limit, offset: options.offset },
  });
  return {
    items: payload.items.map(adaptMessage),
    total: payload.total,
  };
}

export async function postMessage(chatId: string, content: string): Promise<Message> {
  const body: MessageCreateRequest = { content };
  const payload = await apiClient.post<MessageRead>(`/chats/${chatId}/messages`, { json: body });
  return adaptMessage(payload);
}
