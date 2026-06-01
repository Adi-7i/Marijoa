import { describe, it, expect } from "vitest";
import {
  MOCK_USER,
  MOCK_ORGANIZATIONS,
  MOCK_WORKSPACES,
  MOCK_CHATS,
  MOCK_MESSAGES,
  MOCK_ARTIFACTS,
  MOCK_FILES,
  adaptMessageToChat,
} from "@/lib/mock/mock-data";

describe("mock data", () => {
  it("has a current user with required fields", () => {
    expect(MOCK_USER.id).toBeTruthy();
    expect(MOCK_USER.name).toBeTruthy();
    expect(MOCK_USER.initials).toHaveLength(2);
  });

  it("has personal and company organizations", () => {
    const types = MOCK_ORGANIZATIONS.map((o) => o.type);
    expect(types).toContain("PERSONAL");
    expect(types).toContain("COMPANY");
  });

  it("has workspaces for each organization", () => {
    const orgIds = MOCK_ORGANIZATIONS.map((o) => o.id);
    for (const orgId of orgIds) {
      const workspaces = MOCK_WORKSPACES.filter((w) => w.organizationId === orgId);
      expect(workspaces.length).toBeGreaterThan(0);
    }
  });

  it("has at least one default workspace per organization", () => {
    const orgIds = MOCK_ORGANIZATIONS.map((o) => o.id);
    for (const orgId of orgIds) {
      const hasDefault = MOCK_WORKSPACES.some(
        (w) => w.organizationId === orgId && w.isDefault
      );
      expect(hasDefault).toBe(true);
    }
  });

  it("has chats linked to valid workspaces", () => {
    const wsIds = new Set(MOCK_WORKSPACES.map((w) => w.id));
    for (const chat of MOCK_CHATS) {
      expect(wsIds.has(chat.workspaceId)).toBe(true);
    }
  });

  it("has messages linked to valid chats", () => {
    const chatIds = new Set(MOCK_CHATS.map((c) => c.id));
    for (const msg of MOCK_MESSAGES) {
      expect(chatIds.has(msg.chatId)).toBe(true);
    }
  });

  it("adaptMessageToChat maps user role correctly", () => {
    const msg = MOCK_MESSAGES.find((m) => m.role === "user");
    expect(msg).toBeDefined();
    if (!msg) return;
    const chatMsg = adaptMessageToChat(msg);
    expect(chatMsg.role).toBe("user");
    expect(chatMsg.content).toBe(msg.content);
  });

  it("adaptMessageToChat maps non-user roles to assistant", () => {
    const msg = MOCK_MESSAGES.find((m) => m.role === "assistant");
    expect(msg).toBeDefined();
    if (!msg) return;
    const chatMsg = adaptMessageToChat(msg);
    expect(chatMsg.role).toBe("assistant");
  });

  it("has artifacts with valid workspace references", () => {
    const wsIds = new Set(MOCK_WORKSPACES.map((w) => w.id));
    for (const artifact of MOCK_ARTIFACTS) {
      expect(wsIds.has(artifact.workspaceId)).toBe(true);
    }
  });

  it("has files with valid workspace references", () => {
    const wsIds = new Set(MOCK_WORKSPACES.map((w) => w.id));
    for (const file of MOCK_FILES) {
      expect(wsIds.has(file.workspaceId)).toBe(true);
    }
  });
});
