"use client";

import { useCallback } from "react";
import { listMessages } from "@/lib/api/messages";
import type { Message } from "@/types/marijoa";
import { useAsyncResource } from "./useAsyncResource";

export function useMessages(chatId: string | null | undefined, enabled: boolean) {
  const load = useCallback(async () => {
    if (!chatId) return [] as Message[];
    const result = await listMessages(chatId, { limit: 200 });
    return result.items;
  }, [chatId]);
  return useAsyncResource<Message[]>(load, `${chatId ?? ""}:${enabled}`, {
    enabled: enabled && Boolean(chatId),
    initialData: [],
  });
}
