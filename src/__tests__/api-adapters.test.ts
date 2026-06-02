import { describe, it, expect } from "vitest";
import {
  adaptArtifact,
  adaptAuthUser,
  adaptChat,
  adaptFile,
  adaptMessage,
  adaptOrganization,
  adaptOrganizationMember,
  adaptPersonalOrganization,
  adaptPersonalWorkspace,
  adaptWorkspace,
  initialsFromName,
  isoToMs,
  toBackendArtifactType,
} from "@/lib/api/adapters";

describe("isoToMs", () => {
  it("converts ISO 8601 strings to milliseconds", () => {
    expect(isoToMs("2026-06-01T00:00:00Z")).toBe(Date.parse("2026-06-01T00:00:00Z"));
  });
  it("returns 0 for null/undefined/invalid", () => {
    expect(isoToMs(null)).toBe(0);
    expect(isoToMs(undefined)).toBe(0);
    expect(isoToMs("not a date")).toBe(0);
  });
});

describe("initialsFromName", () => {
  it("produces 2-letter initials from a multi-word name", () => {
    expect(initialsFromName("Naruto Uzumaki")).toBe("NU");
  });
  it("produces initials from a single name", () => {
    expect(initialsFromName("Sakura")).toBe("SA");
  });
  it("handles empty input", () => {
    expect(initialsFromName("")).toBe("?");
  });
});

describe("adaptAuthUser", () => {
  it("maps backend fields to camelCase domain User", () => {
    const user = adaptAuthUser({
      id: "u-1",
      full_name: "Test User",
      email: "t@u.co",
      avatar_url: null,
      is_active: true,
      is_verified: true,
      created_at: "2026-06-01T00:00:00Z",
    });
    expect(user).toMatchObject({
      id: "u-1",
      name: "Test User",
      email: "t@u.co",
      initials: "TU",
    });
    expect(user.avatarUrl).toBeUndefined();
  });
});

describe("adaptOrganization", () => {
  it("preserves current_user_role if present", () => {
    const org = adaptOrganization({
      id: "org-1",
      name: "Acme",
      slug: "acme",
      owner_id: "u-1",
      type: "COMPANY",
      is_active: true,
      created_at: "2026-06-01T00:00:00Z",
      updated_at: "2026-06-01T00:00:00Z",
      current_user_role: "ADMIN",
    });
    expect(org.role).toBe("ADMIN");
    expect(org.type).toBe("COMPANY");
  });
});

describe("adaptPersonalOrganization / adaptPersonalWorkspace", () => {
  it("assigns OWNER role and slugifies the name", () => {
    const org = adaptPersonalOrganization({
      id: "org-personal",
      name: "Naruto's Personal",
      type: "PERSONAL",
    });
    expect(org.role).toBe("OWNER");
    expect(org.slug).toBe("naruto-s-personal");
  });

  it("marks the personal workspace as default", () => {
    const ws = adaptPersonalWorkspace({
      id: "ws-1",
      name: "Personal",
      organization_id: "org-personal",
    });
    expect(ws.isDefault).toBe(true);
    expect(ws.userRole).toBe("OWNER");
  });
});

describe("adaptWorkspace", () => {
  it("extracts the role and timestamps", () => {
    const ws = adaptWorkspace({
      id: "ws-1",
      organization_id: "org-1",
      name: "Sales",
      description: "Sales team",
      system_instruction: null,
      created_by: "u-1",
      is_active: true,
      created_at: "2026-06-01T00:00:00Z",
      updated_at: "2026-06-02T00:00:00Z",
      current_user_role: "ADMIN",
    });
    expect(ws.userRole).toBe("ADMIN");
    expect(ws.description).toBe("Sales team");
    expect(ws.createdAt).toBeGreaterThan(0);
    expect(ws.updatedAt).toBeGreaterThan(0);
  });
});

describe("adaptChat / adaptMessage", () => {
  it("derives updatedAt from last_message_at when set", () => {
    const chat = adaptChat(
      {
        id: "c-1",
        workspace_id: "ws-1",
        user_id: "u-1",
        title: "Hi",
        status: "ACTIVE",
        last_message_at: "2026-06-01T01:00:00Z",
        created_at: "2026-06-01T00:00:00Z",
        updated_at: "2026-06-01T00:30:00Z",
      },
      "org-1"
    );
    expect(chat.updatedAt).toBe(Date.parse("2026-06-01T01:00:00Z"));
    expect(chat.organizationId).toBe("org-1");
  });

  it("normalizes message role to a known value", () => {
    const msg = adaptMessage({
      id: "m-1",
      chat_id: "c-1",
      user_id: null,
      role: "assistant",
      content: "hello",
      model: "claude-4",
      metadata_json: null,
      created_at: "2026-06-01T00:00:00Z",
      updated_at: "2026-06-01T00:00:00Z",
    });
    expect(msg.role).toBe("assistant");
    expect(msg.content).toBe("hello");
  });
});

describe("adaptArtifact", () => {
  it("normalizes type and exposes language from metadata", () => {
    const a = adaptArtifact({
      id: "a-1",
      workspace_id: "ws-1",
      chat_id: null,
      created_by: "u-1",
      title: "Snippet",
      type: "code",
      content: "console.log(1)",
      version: 1,
      is_active: true,
      metadata_json: { language: "javascript" },
      created_at: "2026-06-01T00:00:00Z",
      updated_at: "2026-06-01T00:00:00Z",
    });
    expect(a.type).toBe("code");
    expect(a.language).toBe("javascript");
  });

  it("falls back to 'note' on unknown type", () => {
    const a = adaptArtifact({
      id: "a-2",
      workspace_id: "ws-1",
      chat_id: null,
      created_by: "u-1",
      title: "X",
      type: "weird" as never,
      content: "",
      version: 1,
      is_active: true,
      metadata_json: null,
      created_at: "2026-06-01T00:00:00Z",
      updated_at: "2026-06-01T00:00:00Z",
    });
    expect(a.type).toBe("note");
  });
});

describe("toBackendArtifactType", () => {
  it("downgrades chart/table to document", () => {
    expect(toBackendArtifactType("chart")).toBe("document");
    expect(toBackendArtifactType("table")).toBe("document");
  });
  it("passes through canonical types", () => {
    expect(toBackendArtifactType("code")).toBe("code");
    expect(toBackendArtifactType("note")).toBe("note");
  });
});

describe("adaptFile", () => {
  it("maps mime types to short type tokens", () => {
    const f = adaptFile({
      id: "f-1",
      workspace_id: "ws-1",
      uploaded_by: "u-1",
      original_filename: "report.pdf",
      stored_filename: "stored.pdf",
      mime_type: "application/pdf",
      size_bytes: 1024,
      storage_provider: "azure_blob",
      blob_container: "files",
      status: "READY",
      checksum_sha256: null,
      metadata_json: null,
      is_active: true,
      created_at: "2026-06-01T00:00:00Z",
      updated_at: "2026-06-01T00:00:00Z",
    });
    expect(f.type).toBe("pdf");
    expect(f.status).toBe("READY");
    expect(f.sizeBytes).toBe(1024);
  });
});

describe("adaptOrganizationMember", () => {
  it("denormalizes user fields onto the member", () => {
    const m = adaptOrganizationMember({
      id: "m-1",
      organization_id: "org-1",
      user_id: "u-1",
      role: "MANAGER",
      status: "ACTIVE",
      created_at: "2026-06-01T00:00:00Z",
      updated_at: "2026-06-01T00:00:00Z",
      user_full_name: "Lee Smith",
      user_email: "lee@example.com",
      user_avatar_url: null,
    });
    expect(m.fullName).toBe("Lee Smith");
    expect(m.email).toBe("lee@example.com");
    expect(m.initials).toBe("LS");
    expect(m.role).toBe("MANAGER");
  });
});
