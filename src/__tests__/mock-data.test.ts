import { describe, it, expect } from "vitest";
import {
  MOCK_USER,
  MOCK_ORGANIZATIONS,
  MOCK_WORKSPACES,
  MOCK_CHATS,
  MOCK_MESSAGES,
  MOCK_ARTIFACTS,
  MOCK_FILES,
  MOCK_MEMBERS,
  MOCK_WORKSPACE_CONTEXTS,
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

  it("company org is Cynerza Systems Pvt Ltd", () => {
    const company = MOCK_ORGANIZATIONS.find((o) => o.type === "COMPANY");
    expect(company?.name).toBe("Cynerza Systems Pvt Ltd");
    expect(company?.id).toBe("org-cynerza");
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

  it("Cynerza has all required workspaces", () => {
    const wsNames = MOCK_WORKSPACES.filter((w) => w.organizationId === "org-cynerza").map((w) => w.name);
    expect(wsNames).toContain("Sales Team");
    expect(wsNames).toContain("Tech Team");
    expect(wsNames).toContain("HR Team");
    expect(wsNames).toContain("Client - Tech Corner");
    expect(wsNames).toContain("Client - Popular Gym");
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

  it("has 5 Cynerza members with all roles covered", () => {
    const members = MOCK_MEMBERS.filter((m) => m.organizationId === "org-cynerza");
    expect(members).toHaveLength(5);
    const roles = members.map((m) => m.role);
    expect(roles).toContain("OWNER");
    expect(roles).toContain("ADMIN");
    expect(roles).toContain("MANAGER");
    expect(roles).toContain("MEMBER");
    expect(roles).toContain("VIEWER");
  });

  it("all members have required fields", () => {
    for (const member of MOCK_MEMBERS) {
      expect(member.id).toBeTruthy();
      expect(member.fullName).toBeTruthy();
      expect(member.email).toBeTruthy();
      expect(member.initials).toHaveLength(2);
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

  it("artifacts have extended type fields", () => {
    const sales = MOCK_ARTIFACTS.filter((a) => a.workspaceId === "ws-cynerza-sales");
    const types = sales.map((a) => a.type);
    expect(types).toContain("email");
    expect(types).toContain("prompt");
  });

  it("artifacts include proposal and document types for Cynerza workspaces", () => {
    const types = MOCK_ARTIFACTS.map((a) => a.type);
    expect(types).toContain("proposal");
    expect(types).toContain("document");
    expect(types).toContain("code");
    expect(types).toContain("note");
  });

  it("files have status field", () => {
    for (const file of MOCK_FILES) {
      expect(file.status).toBeDefined();
    }
  });

  it("has workspace contexts for all workspaces", () => {
    const wsIds = MOCK_WORKSPACES.map((w) => w.id);
    for (const wsId of wsIds) {
      const ctx = MOCK_WORKSPACE_CONTEXTS.find((c) => c.workspaceId === wsId);
      expect(ctx).toBeDefined();
    }
  });

  it("workspace contexts have required stats fields", () => {
    for (const ctx of MOCK_WORKSPACE_CONTEXTS) {
      expect(ctx.stats).toBeDefined();
      expect(typeof ctx.stats.chats).toBe("number");
      expect(typeof ctx.stats.files).toBe("number");
      expect(typeof ctx.stats.artifacts).toBe("number");
      expect(typeof ctx.stats.members).toBe("number");
    }
  });
});
