import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import {
  MOCK_COMPANY_ORG,
  MOCK_ADMIN_USAGE,
  MOCK_MEMBERS,
  MOCK_AUDIT_LOGS,
} from "@/lib/mock/mock-data";

describe("AdminDashboard", () => {
  it("renders organization name and Admin label", () => {
    render(
      <AdminDashboard
        org={MOCK_COMPANY_ORG}
        usage={MOCK_ADMIN_USAGE}
        members={MOCK_MEMBERS}
        auditLogs={MOCK_AUDIT_LOGS}
        currentUserRole="OWNER"
      />
    );
    expect(screen.getByText(MOCK_COMPANY_ORG.name)).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(
      screen.getByText(/Manage organization users, usage, and activity/i)
    ).toBeInTheDocument();
  });

  it("starts on Overview tab and shows usage cards", () => {
    render(
      <AdminDashboard
        org={MOCK_COMPANY_ORG}
        usage={MOCK_ADMIN_USAGE}
        members={MOCK_MEMBERS}
        auditLogs={MOCK_AUDIT_LOGS}
        currentUserRole="OWNER"
      />
    );
    expect(screen.getByText("Storage Used")).toBeInTheDocument();
    expect(screen.getByText("Active Users")).toBeInTheDocument();
    expect(screen.getByText(/total members/i)).toBeInTheDocument();
  });

  it("switches to Users tab and shows member rows", () => {
    render(
      <AdminDashboard
        org={MOCK_COMPANY_ORG}
        usage={MOCK_ADMIN_USAGE}
        members={MOCK_MEMBERS}
        auditLogs={MOCK_AUDIT_LOGS}
        currentUserRole="OWNER"
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /^Users$/ }));
    expect(screen.getByText("Members")).toBeInTheDocument();
    expect(screen.getByText(MOCK_MEMBERS[0].fullName)).toBeInTheDocument();
  });

  it("switches to Audit Logs tab and shows action badges", () => {
    render(
      <AdminDashboard
        org={MOCK_COMPANY_ORG}
        usage={MOCK_ADMIN_USAGE}
        members={MOCK_MEMBERS}
        auditLogs={MOCK_AUDIT_LOGS}
        currentUserRole="OWNER"
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Audit Logs/i }));
    expect(screen.getByText(/events shown/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/filter by action/i)).toBeInTheDocument();
  });

  it("switches to Settings tab and shows placeholder cards", () => {
    render(
      <AdminDashboard
        org={MOCK_COMPANY_ORG}
        usage={MOCK_ADMIN_USAGE}
        members={MOCK_MEMBERS}
        auditLogs={MOCK_AUDIT_LOGS}
        currentUserRole="OWNER"
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Settings/i }));
    expect(screen.getByText("Organization Settings")).toBeInTheDocument();
    expect(screen.getByText("General Settings")).toBeInTheDocument();
    expect(screen.getAllByText(/Coming in a later phase/i).length).toBeGreaterThan(0);
  });
});
