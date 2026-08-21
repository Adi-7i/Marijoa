import { describe, it, expect } from "vitest";
import {
  adaptInvitation,
  adaptInvitationAccept,
  adaptInvitationCreate,
  adaptInvitationValidate,
} from "@/lib/api/adapters";
import type {
  InvitationAcceptResponse,
  InvitationCreateResponse,
  InvitationRead,
  InvitationValidateResponse,
} from "@/lib/api/types";

const baseInv: InvitationRead = {
  id: "inv-1",
  organization_id: "org-1",
  email: "Member@Example.com",
  role: "MEMBER",
  status: "PENDING_SIGNUP",
  invited_by: "user-1",
  accepted_user_id: null,
  expires_at: "2026-07-01T00:00:00Z",
  created_at: "2026-06-01T00:00:00Z",
  accepted_at: null,
  approved_at: null,
  rejected_at: null,
};

describe("adaptInvitation", () => {
  it("maps snake_case to camelCase and converts ISO strings", () => {
    const result = adaptInvitation(baseInv);
    expect(result.id).toBe("inv-1");
    expect(result.organizationId).toBe("org-1");
    expect(result.email).toBe("Member@Example.com");
    expect(result.role).toBe("MEMBER");
    expect(result.status).toBe("PENDING_SIGNUP");
    expect(result.expiresAt).toBe(Date.parse("2026-07-01T00:00:00Z"));
    expect(result.acceptedUserId).toBeUndefined();
  });

  it("normalizes unknown status to PENDING_SIGNUP", () => {
    const result = adaptInvitation({ ...baseInv, status: "FOO_BAR" as never });
    expect(result.status).toBe("PENDING_SIGNUP");
  });

  it("normalizes unknown role to MEMBER", () => {
    const result = adaptInvitation({ ...baseInv, role: "OWNER" as never });
    expect(result.role).toBe("MEMBER");
  });

  it("does not expose any token_hash field", () => {
    const result = adaptInvitation(baseInv);
    expect("tokenHash" in result).toBe(false);
    expect("token_hash" in result).toBe(false);
  });
});

describe("adaptInvitationCreate", () => {
  it("surfaces the invite_url verbatim on the domain shape", () => {
    const payload: InvitationCreateResponse = {
      ...baseInv,
      invite_url: "http://localhost:3000/invite/accept/abc123",
    };
    const result = adaptInvitationCreate(payload);
    expect(result.inviteUrl).toBe("http://localhost:3000/invite/accept/abc123");
    expect(result.id).toBe(baseInv.id);
  });
});

describe("adaptInvitationValidate", () => {
  it("returns safe public metadata only", () => {
    const payload: InvitationValidateResponse = {
      valid: true,
      organization_name: "Acme",
      email: "x@y.com",
      role: "MEMBER",
      status: "PENDING_SIGNUP",
      expires_at: "2026-07-01T00:00:00Z",
    };
    const result = adaptInvitationValidate(payload);
    expect(result.valid).toBe(true);
    expect(result.organizationName).toBe("Acme");
    expect(result.email).toBe("x@y.com");
    expect(result.expiresAt).toBe(Date.parse("2026-07-01T00:00:00Z"));
    expect("token_hash" in result).toBe(false);
    expect("tokenHash" in result).toBe(false);
  });
});

describe("adaptInvitationAccept", () => {
  it("maps backend accept response to domain shape", () => {
    const payload: InvitationAcceptResponse = {
      status: "PENDING_APPROVAL",
      organization_name: "Acme",
      message: "Your request has been submitted.",
    };
    const result = adaptInvitationAccept(payload);
    expect(result.status).toBe("PENDING_APPROVAL");
    expect(result.organizationName).toBe("Acme");
    expect(result.message).toMatch(/submitted/);
  });
});
