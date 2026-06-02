"use client";

import { useCallback } from "react";
import { listArtifacts } from "@/lib/api/artifacts";
import type { Artifact } from "@/types/marijoa";
import { useAsyncResource } from "./useAsyncResource";

export function useArtifacts(workspaceId: string | null | undefined, enabled: boolean) {
  const load = useCallback(async () => {
    if (!workspaceId) return [] as Artifact[];
    const result = await listArtifacts({ workspaceId, limit: 100 });
    return result.items;
  }, [workspaceId]);
  return useAsyncResource<Artifact[]>(load, `${workspaceId ?? ""}:${enabled}`, {
    enabled: enabled && Boolean(workspaceId),
    initialData: [],
  });
}
