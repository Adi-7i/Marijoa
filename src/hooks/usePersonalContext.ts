"use client";

import { useCallback } from "react";
import { fetchPersonalContext, type PersonalContext } from "@/lib/api/personal";
import { useAsyncResource } from "./useAsyncResource";

export function usePersonalContext(enabled: boolean) {
  const load = useCallback(() => fetchPersonalContext(), []);
  return useAsyncResource<PersonalContext>(load, enabled ? "enabled" : "disabled", { enabled });
}
