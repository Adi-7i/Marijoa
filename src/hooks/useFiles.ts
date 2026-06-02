"use client";

import { useCallback } from "react";
import { listFiles } from "@/lib/api/files";
import type { FileItem } from "@/types/marijoa";
import { useAsyncResource } from "./useAsyncResource";

export function useFiles(workspaceId: string | null | undefined, enabled: boolean) {
  const load = useCallback(async () => {
    if (!workspaceId) return [] as FileItem[];
    const result = await listFiles({ workspaceId, limit: 100 });
    return result.items;
  }, [workspaceId]);
  return useAsyncResource<FileItem[]>(load, `${workspaceId ?? ""}:${enabled}`, {
    enabled: enabled && Boolean(workspaceId),
    initialData: [],
  });
}
