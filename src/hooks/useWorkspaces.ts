"use client";

import { useCallback } from "react";
import { listWorkspaces } from "@/lib/api/workspaces";
import type { Workspace } from "@/types/marijoa";
import { useAsyncResource } from "./useAsyncResource";

export function useWorkspaces(orgId: string | null | undefined, enabled: boolean) {
  const load = useCallback(async () => {
    if (!orgId) return [] as Workspace[];
    return listWorkspaces(orgId);
  }, [orgId]);
  return useAsyncResource<Workspace[]>(load, `${orgId ?? ""}:${enabled}`, {
    enabled: enabled && Boolean(orgId),
    initialData: [],
  });
}
