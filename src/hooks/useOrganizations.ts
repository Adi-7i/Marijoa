"use client";

import { useCallback } from "react";
import { listMyOrganizations } from "@/lib/api/organizations";
import type { Organization } from "@/types/marijoa";
import { useAsyncResource } from "./useAsyncResource";

export function useMyOrganizations(enabled: boolean) {
  const load = useCallback(() => listMyOrganizations(), []);
  return useAsyncResource<Organization[]>(load, enabled ? "enabled" : "disabled", {
    enabled,
    initialData: [],
  });
}
