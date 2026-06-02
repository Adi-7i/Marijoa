"use client";

import { apiClient } from "./client";
import { adaptAuthUser } from "./adapters";
import { clearTokens, getRefreshToken, setTokens } from "@/lib/auth/token-store";
import type {
  AuthResponse,
  AuthUserResponse,
  TokenResponse,
} from "./types";
import type { User } from "@/types/marijoa";

export interface AuthSession {
  user: User;
  expiresInSeconds: number;
}

function persistSession(payload: AuthResponse): AuthSession {
  setTokens(payload.access_token, payload.refresh_token);
  return {
    user: adaptAuthUser(payload.user),
    expiresInSeconds: payload.expires_in,
  };
}

export async function registerUser(input: {
  fullName: string;
  email: string;
  password: string;
}): Promise<AuthSession> {
  const payload = await apiClient.post<AuthResponse>("/auth/register", {
    json: {
      full_name: input.fullName,
      email: input.email,
      password: input.password,
    },
    authRequired: false,
  });
  return persistSession(payload);
}

export async function loginUser(input: {
  email: string;
  password: string;
}): Promise<AuthSession> {
  const payload = await apiClient.post<AuthResponse>("/auth/login", {
    json: { email: input.email, password: input.password },
    authRequired: false,
  });
  return persistSession(payload);
}

export async function refreshSession(): Promise<TokenResponse | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;
  try {
    const payload = await apiClient.post<TokenResponse>("/auth/refresh", {
      json: { refresh_token: refresh },
      authRequired: false,
    });
    setTokens(payload.access_token, payload.refresh_token);
    return payload;
  } catch {
    clearTokens();
    return null;
  }
}

export async function logoutUser(): Promise<void> {
  const refresh = getRefreshToken();
  if (refresh) {
    try {
      await apiClient.post("/auth/logout", {
        json: { refresh_token: refresh },
        authRequired: false,
      });
    } catch {
      // ignore — we clear local tokens regardless
    }
  }
  clearTokens();
}

export async function fetchCurrentUser(options?: { silent401?: boolean }): Promise<User> {
  const payload = await apiClient.get<AuthUserResponse>("/auth/me", {
    silent401: options?.silent401,
  });
  return adaptAuthUser(payload);
}
