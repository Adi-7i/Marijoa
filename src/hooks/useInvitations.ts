"use client";

import { useCallback } from "react";
import { listInvitations } from "@/lib/api/invitations";
import type { OrganizationInvitation } from "@/types/marijoa";
import { useAsyncResource } from "./useAsyncResource";

export function useOrganizationInvitations(
  orgId: string | null | undefined,
  enabled: boolean
) {
  const load = useCallback(async () => {
    if (!orgId) return [] as OrganizationInvitation[];
    return listInvitations(orgId, { limit: 200 });
  }, [orgId]);
  return useAsyncResource<OrganizationInvitation[]>(
    load,
    `${orgId ?? ""}:${enabled}:invitations`,
    {
      enabled: enabled && Boolean(orgId),
      initialData: [],
    }
  );
}
