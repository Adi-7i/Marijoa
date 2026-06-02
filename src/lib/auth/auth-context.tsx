"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { setUnauthorizedHandler } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import {
  fetchCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
} from "@/lib/api/auth";
import { clearTokens, getAccessToken } from "@/lib/auth/token-store";
import type { User } from "@/types/marijoa";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  bootstrapError: string | null;
  refresh: () => Promise<void>;
  login: (input: { email: string; password: string }) => Promise<User>;
  register: (input: { fullName: string; email: string; password: string }) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const bootstrappedRef = useRef(false);

  const refresh = useCallback(async () => {
    setBootstrapError(null);
    if (!getAccessToken()) {
      setUser(null);
      setStatus("unauthenticated");
      return;
    }
    try {
      const me = await fetchCurrentUser({ silent401: true });
      setUser(me);
      setStatus("authenticated");
    } catch (err) {
      if (err instanceof ApiError && err.isUnauthorized) {
        clearTokens();
        setUser(null);
        setStatus("unauthenticated");
      } else if (err instanceof ApiError && err.isNetworkError) {
        setBootstrapError("Could not reach the Marijoa backend.");
        setStatus("unauthenticated");
      } else {
        setBootstrapError(err instanceof Error ? err.message : "Could not load your session.");
        setStatus("unauthenticated");
      }
    }
  }, []);

  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    void refresh();
  }, [refresh]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setStatus("unauthenticated");
      if (typeof window !== "undefined") {
        const path = window.location.pathname;
        if (!path.startsWith("/login") && !path.startsWith("/signup") && !path.startsWith("/forgot-password")) {
          router.replace("/login");
        }
      }
    });
    return () => setUnauthorizedHandler(null);
  }, [router]);

  const login = useCallback(async (input: { email: string; password: string }) => {
    const session = await loginUser(input);
    setUser(session.user);
    setStatus("authenticated");
    setBootstrapError(null);
    return session.user;
  }, []);

  const register = useCallback(
    async (input: { fullName: string; email: string; password: string }) => {
      const session = await registerUser(input);
      setUser(session.user);
      setStatus("authenticated");
      setBootstrapError(null);
      return session.user;
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } finally {
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, bootstrapError, refresh, login, register, logout }),
    [status, user, bootstrapError, refresh, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside an <AuthProvider>.");
  }
  return ctx;
}
