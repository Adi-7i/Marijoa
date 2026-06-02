"use client";

import { API_BASE_URL } from "./config";
import { ApiError, type ApiErrorDetails } from "./errors";
import { clearTokens, getAccessToken } from "@/lib/auth/token-store";

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export interface RequestOptions {
  method?: Method;
  query?: Record<string, string | number | boolean | null | undefined>;
  json?: unknown;
  body?: BodyInit | null;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** Skip attaching the Authorization header (for /auth/login, /auth/register). */
  authRequired?: boolean;
  /** Pass through unauthorized responses without clearing tokens (used by session bootstrap probe). */
  silent401?: boolean;
}

type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  let url = `${API_BASE_URL}${normalized}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      params.append(key, String(value));
    }
    const qs = params.toString();
    if (qs) url += (url.includes("?") ? "&" : "?") + qs;
  }
  return url;
}

function isFormData(body: unknown): body is FormData {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();
  if (!text) return null;
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return text;
}

type BackendErrorEnvelope = {
  error?: {
    code?: unknown;
    message?: unknown;
    details?: unknown;
  };
  detail?: unknown;
};

function extractErrorEnvelope(body: unknown, status: number, statusText: string): ApiError {
  if (body && typeof body === "object") {
    const envelope = body as BackendErrorEnvelope;
    if (envelope.error && typeof envelope.error === "object") {
      const err = envelope.error;
      return new ApiError({
        status,
        code: typeof err.code === "string" ? err.code : `HTTP_${status}`,
        message:
          typeof err.message === "string" && err.message.trim().length > 0
            ? err.message
            : statusText || "Request failed.",
        details: (err.details ?? null) as ApiErrorDetails | null,
      });
    }
    if (typeof envelope.detail === "string") {
      return new ApiError({
        status,
        code: `HTTP_${status}`,
        message: envelope.detail,
      });
    }
  }
  if (typeof body === "string" && body.trim().length > 0) {
    return new ApiError({
      status,
      code: `HTTP_${status}`,
      message: body,
    });
  }
  return new ApiError({
    status,
    code: `HTTP_${status}`,
    message: statusText || "Request failed.",
  });
}

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    method = "GET",
    query,
    json,
    body,
    headers = {},
    signal,
    authRequired = true,
    silent401 = false,
  } = options;

  const finalHeaders: Record<string, string> = { Accept: "application/json", ...headers };

  let finalBody: BodyInit | null | undefined;
  if (json !== undefined) {
    finalHeaders["Content-Type"] = finalHeaders["Content-Type"] ?? "application/json";
    finalBody = JSON.stringify(json);
  } else if (body !== undefined) {
    finalBody = body;
    if (isFormData(body)) {
      // Let the runtime set the multipart boundary; do not force Content-Type.
      delete finalHeaders["Content-Type"];
    }
  }

  if (authRequired) {
    const token = getAccessToken();
    if (token) finalHeaders["Authorization"] = `Bearer ${token}`;
  }

  const url = buildUrl(path, query);

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: finalHeaders,
      body: finalBody,
      signal,
      credentials: "omit",
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw err;
    }
    throw new ApiError({
      status: 0,
      code: "NETWORK_ERROR",
      message: "Could not reach the Marijoa backend. Please check your connection.",
      isNetworkError: true,
    });
  }

  if (response.ok) {
    const data = await parseBody(response);
    return data as T;
  }

  const errorBody = await parseBody(response);
  const error = extractErrorEnvelope(errorBody, response.status, response.statusText);

  if (response.status === 401 && !silent401) {
    clearTokens();
    if (unauthorizedHandler) {
      try {
        unauthorizedHandler();
      } catch {
        // never let a handler error mask the original failure
      }
    }
  }

  throw error;
}

export const apiClient = {
  get<T>(path: string, options?: Omit<RequestOptions, "method" | "json" | "body">) {
    return apiRequest<T>(path, { ...options, method: "GET" });
  },
  post<T>(path: string, options?: Omit<RequestOptions, "method">) {
    return apiRequest<T>(path, { ...options, method: "POST" });
  },
  patch<T>(path: string, options?: Omit<RequestOptions, "method">) {
    return apiRequest<T>(path, { ...options, method: "PATCH" });
  },
  put<T>(path: string, options?: Omit<RequestOptions, "method">) {
    return apiRequest<T>(path, { ...options, method: "PUT" });
  },
  delete<T>(path: string, options?: Omit<RequestOptions, "method" | "json" | "body">) {
    return apiRequest<T>(path, { ...options, method: "DELETE" });
  },
};

export type ApiClient = typeof apiClient;

export { buildUrl as buildApiUrl };
