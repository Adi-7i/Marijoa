import { describe, it, expect, beforeEach } from "vitest";
import {
  mockLogin,
  mockSignup,
  mockLogout,
  isMockAuthenticated,
  getMockUser,
} from "@/lib/mock/mock-auth";

describe("mock-auth", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts unauthenticated", () => {
    expect(isMockAuthenticated()).toBe(false);
    expect(getMockUser()).toBeNull();
  });

  it("mockLogin sets the auth flag and persists user", async () => {
    const user = await mockLogin("kakashi@konoha.dev", "anything");
    expect(user.email).toBe("kakashi@konoha.dev");
    expect(isMockAuthenticated()).toBe(true);
    const stored = getMockUser();
    expect(stored?.email).toBe("kakashi@konoha.dev");
    expect(stored?.name).toBeTruthy();
  });

  it("mockLogin rejects empty credentials", async () => {
    await expect(mockLogin("", "")).rejects.toThrow();
    expect(isMockAuthenticated()).toBe(false);
  });

  it("mockSignup sets the auth flag and stores provided name", async () => {
    const user = await mockSignup(
      "Naruto Uzumaki",
      "naruto@konoha.dev",
      "validpass1"
    );
    expect(user.name).toBe("Naruto Uzumaki");
    expect(isMockAuthenticated()).toBe(true);
    const stored = getMockUser();
    expect(stored?.name).toBe("Naruto Uzumaki");
    expect(stored?.email).toBe("naruto@konoha.dev");
  });

  it("mockSignup rejects empty fields", async () => {
    await expect(mockSignup("", "", "")).rejects.toThrow();
  });

  it("mockLogout clears the auth flag and user", async () => {
    await mockSignup("Sakura", "sakura@konoha.dev", "validpass1");
    expect(isMockAuthenticated()).toBe(true);
    mockLogout();
    expect(isMockAuthenticated()).toBe(false);
    expect(getMockUser()).toBeNull();
  });

  it("does NOT create a real token (only stores mock flag and display info)", async () => {
    await mockLogin("a@b.co", "x");
    const keys = Object.keys(localStorage);
    expect(keys).toContain("marijoa_mock_auth");
    expect(keys).not.toContain("token");
    expect(keys).not.toContain("access_token");
    expect(keys).not.toContain("jwt");
    expect(keys.every((k) => k.startsWith("marijoa_mock_"))).toBe(true);
  });
});
