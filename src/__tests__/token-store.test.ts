import { describe, it, expect, beforeEach } from "vitest";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  hasAccessToken,
  onTokenChange,
  setAccessToken,
  setRefreshToken,
  setTokens,
  TOKEN_STORAGE_KEYS,
} from "@/lib/auth/token-store";

describe("token-store", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts with no tokens", () => {
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(hasAccessToken()).toBe(false);
  });

  it("setAccessToken and setRefreshToken persist values independently", () => {
    setAccessToken("aaa");
    setRefreshToken("rrr");
    expect(getAccessToken()).toBe("aaa");
    expect(getRefreshToken()).toBe("rrr");
    expect(hasAccessToken()).toBe(true);
  });

  it("setTokens writes both tokens in one operation", () => {
    setTokens("acc", "ref");
    expect(getAccessToken()).toBe("acc");
    expect(getRefreshToken()).toBe("ref");
  });

  it("clearTokens removes both tokens", () => {
    setTokens("a", "b");
    clearTokens();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it("uses namespaced storage keys", () => {
    setTokens("a", "b");
    expect(localStorage.getItem(TOKEN_STORAGE_KEYS.access)).toBe("a");
    expect(localStorage.getItem(TOKEN_STORAGE_KEYS.refresh)).toBe("b");
    expect(TOKEN_STORAGE_KEYS.access.startsWith("marijoa")).toBe(true);
  });

  it("notifies listeners on changes and unsubscribes cleanly", () => {
    let count = 0;
    const unsub = onTokenChange(() => {
      count += 1;
    });
    setAccessToken("a");
    setRefreshToken("b");
    clearTokens();
    expect(count).toBe(3);
    unsub();
    setAccessToken("c");
    expect(count).toBe(3);
  });

  it("setAccessToken(null) clears just the access token", () => {
    setTokens("a", "b");
    setAccessToken(null);
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBe("b");
  });
});
