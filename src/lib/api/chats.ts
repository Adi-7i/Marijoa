"use client";

import { apiClient } from "./client";
import { adaptChat } from "./adapters";
import type { ChatCreateRequest, ChatRead, ChatStatus, ChatUpdateRequest } from "./types";
import type { Chat } from "@/types/marijoa";

export async function listChats(input: {
  workspaceId: string;
  organizationId?: string;
  status?: ChatStatus;
}): Promise<Chat[]> {
  const payload = await apiClient.get<ChatRead[]>("/chats", {
    query: {
      workspace_id: input.workspaceId,
      status: input.status,
    },
  });
  return payload.map((c) => adaptChat(c, input.organizationId));
}

export async function createChat(input: {
  workspaceId: string;
  organizationId?: string;
  title?: string;
}): Promise<Chat> {
  const body: ChatCreateRequest = {
    workspace_id: input.workspaceId,
    title: input.title ?? null,
  };
  const payload = await apiClient.post<ChatRead>("/chats", { json: body });
  return adaptChat(payload, input.organizationId);
}

export async function getChat(chatId: string, organizationId?: string): Promise<Chat> {
  const payload = await apiClient.get<ChatRead>(`/chats/${chatId}`);
  return adaptChat(payload, organizationId);
}

export async function renameChat(chatId: string, title: string, organizationId?: string): Promise<Chat> {
  const body: ChatUpdateRequest = { title };
  const payload = await apiClient.patch<ChatRead>(`/chats/${chatId}`, { json: body });
  return adaptChat(payload, organizationId);
}

export async function archiveChat(chatId: string, organizationId?: string): Promise<Chat> {
  const body: ChatUpdateRequest = { status: "ARCHIVED" };
  const payload = await apiClient.patch<ChatRead>(`/chats/${chatId}`, { json: body });
  return adaptChat(payload, organizationId);
}

export async function deleteChat(chatId: string): Promise<void> {
  await apiClient.delete(`/chats/${chatId}`);
}
