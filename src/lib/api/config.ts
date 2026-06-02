/**
 * Resolves the backend API base URL from `NEXT_PUBLIC_API_BASE_URL`.
 *
 * The value MUST include the API version prefix (e.g. `/api/v1`) and MUST NOT
 * have a trailing slash. We strip a trailing slash defensively but keep
 * everything else as-is so the frontend stays bound to the env var.
 */

const FALLBACK_API_BASE_URL = "http://127.0.0.1:8000/api/v1";

function readEnv(): string | undefined {
  if (typeof process === "undefined" || !process.env) return undefined;
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function getApiBaseUrl(): string {
  const raw = readEnv() ?? FALLBACK_API_BASE_URL;
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

export const API_BASE_URL = getApiBaseUrl();
