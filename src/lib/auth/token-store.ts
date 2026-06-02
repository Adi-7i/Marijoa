"use client";

/**
 * Centralized access / refresh token storage for the Marijoa frontend.
 *
 * MVP design: tokens are stored in `localStorage`. This is acceptable for the
 * MVP because:
 *  - the backend issues short-lived access tokens (30 min default)
 *  - refresh tokens rotate on each refresh call
 *  - the frontend never logs tokens
 *  - all storage access goes through this module (single audit surface)
 *
 * A future hardening step is to move the refresh token to an httpOnly cookie
 * controlled by the backend. When that happens, only this file and the
 * `auth.ts` service need to change.
 */

const ACCESS_TOKEN_KEY = "marijoa.access_token";
const REFRESH_TOKEN_KEY = "marijoa.refresh_token";

type TokenChangeListener = () => void;
const listeners = new Set<TokenChangeListener>();

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function notify() {
  for (const l of listeners) l();
}

export function getAccessToken(): string | null {
  return safeStorage()?.getItem(ACCESS_TOKEN_KEY) ?? null;
}

export function setAccessToken(token: string | null): void {
  const storage = safeStorage();
  if (!storage) return;
  if (token) storage.setItem(ACCESS_TOKEN_KEY, token);
  else storage.removeItem(ACCESS_TOKEN_KEY);
  notify();
}

export function getRefreshToken(): string | null {
  return safeStorage()?.getItem(REFRESH_TOKEN_KEY) ?? null;
}

export function setRefreshToken(token: string | null): void {
  const storage = safeStorage();
  if (!storage) return;
  if (token) storage.setItem(REFRESH_TOKEN_KEY, token);
  else storage.removeItem(REFRESH_TOKEN_KEY);
  notify();
}

export function setTokens(access: string, refresh: string): void {
  const storage = safeStorage();
  if (!storage) return;
  storage.setItem(ACCESS_TOKEN_KEY, access);
  storage.setItem(REFRESH_TOKEN_KEY, refresh);
  notify();
}

export function clearTokens(): void {
  const storage = safeStorage();
  if (!storage) return;
  storage.removeItem(ACCESS_TOKEN_KEY);
  storage.removeItem(REFRESH_TOKEN_KEY);
  notify();
}

export function hasAccessToken(): boolean {
  return Boolean(getAccessToken());
}

export function onTokenChange(listener: TokenChangeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const TOKEN_STORAGE_KEYS = Object.freeze({
  access: ACCESS_TOKEN_KEY,
  refresh: REFRESH_TOKEN_KEY,
});
