"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api/errors";

export type AsyncStatus = "idle" | "loading" | "success" | "error";

export interface AsyncResource<T> {
  data: T | null;
  status: AsyncStatus;
  error: string | null;
  errorStatus: number | null;
  isLoading: boolean;
  isError: boolean;
  refresh: () => Promise<void>;
  setData: (data: T | null) => void;
}

interface AsyncResourceOptions<T> {
  enabled?: boolean;
  initialData?: T | null;
  onError?: (error: unknown) => void;
}

function describeError(err: unknown): { message: string; status: number | null } {
  if (err instanceof ApiError) {
    if (err.isNetworkError) {
      return { message: "Could not reach the Marijoa backend.", status: 0 };
    }
    if (err.isUnauthorized) {
      return { message: "Your session has expired. Please sign in again.", status: 401 };
    }
    if (err.isForbidden) {
      return { message: "You do not have access to this resource.", status: 403 };
    }
    return { message: err.message, status: err.status };
  }
  if (err instanceof Error) return { message: err.message, status: null };
  return { message: "Something went wrong.", status: null };
}

/**
 * Generic loader for a single async resource. Re-runs when the
 * `dependencyKey` changes. Avoids races by ignoring stale results.
 */
export function useAsyncResource<T>(
  loader: () => Promise<T>,
  dependencyKey: unknown,
  options: AsyncResourceOptions<T> = {}
): AsyncResource<T> {
  const { enabled = true, initialData = null, onError } = options;
  const [data, setDataState] = useState<T | null>(initialData);
  const [status, setStatus] = useState<AsyncStatus>(enabled ? "loading" : "idle");
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const requestId = useRef(0);

  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const refresh = useCallback(async () => {
    const id = ++requestId.current;
    setStatus("loading");
    setError(null);
    setErrorStatus(null);
    try {
      const result = await loaderRef.current();
      if (id === requestId.current) {
        setDataState(result);
        setStatus("success");
      }
    } catch (err) {
      if (id === requestId.current) {
        const desc = describeError(err);
        setError(desc.message);
        setErrorStatus(desc.status);
        setStatus("error");
      }
      onErrorRef.current?.(err);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      requestId.current += 1;
      setStatus("idle");
      setError(null);
      setErrorStatus(null);
      setDataState(initialData);
      return;
    }
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dependencyKey, enabled, refresh]);

  const setData = useCallback((next: T | null) => {
    setDataState(next);
  }, []);

  return {
    data,
    status,
    error,
    errorStatus,
    isLoading: status === "loading",
    isError: status === "error",
    refresh,
    setData,
  };
}
