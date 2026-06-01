"use client";

import { useCallback } from "react";
import { listOrganizationMembers } from "@/lib/api/organizations";
import type { OrganizationMember } from "@/types/marijoa";
import { useAsyncResource } from "./useAsyncResource";

export function useOrganizationMembers(orgId: string | null | undefined, enabled: boolean) {
  const load = useCallback(async () => {
    if (!orgId) return [] as OrganizationMember[];
    return listOrganizationMembers(orgId);
  }, [orgId]);
  return useAsyncResource<OrganizationMember[]>(load, `${orgId ?? ""}:${enabled}`, {
    enabled: enabled && Boolean(orgId),
    initialData: [],
  });
}
