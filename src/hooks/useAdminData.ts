"use client";

import { useCallback } from "react";
import {
  getAdminUsage,
  listAdminAuditLogs,
  listAdminUsers,
} from "@/lib/api/admin";
import type { AdminUsageSummary, AuditLog, OrganizationMember } from "@/types/marijoa";
import { useAsyncResource } from "./useAsyncResource";

export function useAdminUsage(orgId: string | null | undefined, enabled: boolean) {
  const load = useCallback(async () => {
    if (!orgId) throw new Error("orgId is required.");
    return getAdminUsage(orgId);
  }, [orgId]);
  return useAsyncResource<AdminUsageSummary>(load, `${orgId ?? ""}:${enabled}:usage`, {
    enabled: enabled && Boolean(orgId),
  });
}

export function useAdminUsers(orgId: string | null | undefined, enabled: boolean) {
  const load = useCallback(async () => {
    if (!orgId) return [] as OrganizationMember[];
    const result = await listAdminUsers(orgId, { pageSize: 100 });
    return result.items;
  }, [orgId]);
  return useAsyncResource<OrganizationMember[]>(load, `${orgId ?? ""}:${enabled}:users`, {
    enabled: enabled && Boolean(orgId),
    initialData: [],
  });
}

export function useAdminAuditLogs(orgId: string | null | undefined, enabled: boolean) {
  const load = useCallback(async () => {
    if (!orgId) return [] as AuditLog[];
    const result = await listAdminAuditLogs(orgId, { pageSize: 100 });
    return result.items;
  }, [orgId]);
  return useAsyncResource<AuditLog[]>(load, `${orgId ?? ""}:${enabled}:audit`, {
    enabled: enabled && Boolean(orgId),
    initialData: [],
  });
}
