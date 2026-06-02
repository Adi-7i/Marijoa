import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuditActionBadge, ACTION_LABELS } from "@/components/admin/AuditActionBadge";

describe("AuditActionBadge", () => {
  it("maps USER_LOGIN to User Login", () => {
    render(<AuditActionBadge action="USER_LOGIN" />);
    expect(screen.getByText("User Login")).toBeInTheDocument();
  });

  it("maps FILE_UPLOADED to File Uploaded", () => {
    render(<AuditActionBadge action="FILE_UPLOADED" />);
    expect(screen.getByText("File Uploaded")).toBeInTheDocument();
  });

  it("maps AI_RESPONSE_CREATED to AI Response", () => {
    render(<AuditActionBadge action="AI_RESPONSE_CREATED" />);
    expect(screen.getByText("AI Response")).toBeInTheDocument();
  });

  it("maps ARTIFACT_CREATED to Artifact Created", () => {
    render(<AuditActionBadge action="ARTIFACT_CREATED" />);
    expect(screen.getByText("Artifact Created")).toBeInTheDocument();
  });

  it("maps ADMIN_USAGE_VIEWED to Usage Viewed", () => {
    render(<AuditActionBadge action="ADMIN_USAGE_VIEWED" />);
    expect(screen.getByText("Usage Viewed")).toBeInTheDocument();
  });

  it("has a label for every AuditAction", () => {
    const expectedKeys = [
      "USER_LOGIN", "USER_LOGOUT",
      "ORGANIZATION_CREATED", "ORGANIZATION_MEMBER_ADDED",
      "WORKSPACE_CREATED", "WORKSPACE_UPDATED", "WORKSPACE_DELETED",
      "CHAT_CREATED", "CHAT_UPDATED", "CHAT_DELETED",
      "MESSAGE_CREATED",
      "AI_RESPONSE_CREATED", "AI_STREAM_COMPLETED",
      "ARTIFACT_CREATED", "ARTIFACT_UPDATED", "ARTIFACT_DELETED",
      "FILE_UPLOADED", "FILE_DELETED",
      "ADMIN_USERS_VIEWED", "ADMIN_AUDIT_LOGS_VIEWED", "ADMIN_USAGE_VIEWED",
    ];
    for (const key of expectedKeys) {
      expect(ACTION_LABELS[key as keyof typeof ACTION_LABELS]).toBeTruthy();
    }
  });
});
