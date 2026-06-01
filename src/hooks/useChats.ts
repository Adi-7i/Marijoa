"use client";

import { useCallback } from "react";
import { listChats } from "@/lib/api/chats";
import type { Chat } from "@/types/marijoa";
import { useAsyncResource } from "./useAsyncResource";

export function useChats(input: {
  workspaceId: string | null | undefined;
  organizationId: string | undefined;
  enabled: boolean;
}) {
  const { workspaceId, organizationId, enabled } = input;
  const load = useCallback(async () => {
    if (!workspaceId) return [] as Chat[];
    return listChats({ workspaceId, organizationId });
  }, [workspaceId, organizationId]);
  return useAsyncResource<Chat[]>(
    load,
    `${workspaceId ?? ""}:${organizationId ?? ""}:${enabled}`,
    { enabled: enabled && Boolean(workspaceId), initialData: [] }
  );
}
