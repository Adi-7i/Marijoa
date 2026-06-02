import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { MOCK_COMPANY_ORG, MOCK_ADMIN_USAGE } from "@/lib/mock/mock-data";
import { setTokens, clearTokens } from "@/lib/auth/token-store";

const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function adminUsageBody() {
  return {
    organization_id: MOCK_ADMIN_USAGE.organizationId,
    users_count: MOCK_ADMIN_USAGE.usersCount,
    active_users_count: MOCK_ADMIN_USAGE.activeUsersCount,
    workspaces_count: MOCK_ADMIN_USAGE.workspacesCount,
    chats_count: MOCK_ADMIN_USAGE.chatsCount,
    messages_count: MOCK_ADMIN_USAGE.messagesCount,
    artifacts_count: MOCK_ADMIN_USAGE.artifactsCount,
    files_count: MOCK_ADMIN_USAGE.filesCount,
    storage_bytes: MOCK_ADMIN_USAGE.storageBytes,
  };
}

function adminUsersBody() {
  return {
    items: [
      {
        id: "u-1",
        full_name: "Test Admin",
        email: "admin@marijoa.dev",
        avatar_url: null,
        is_active: true,
        is_verified: true,
        org_role: "OWNER",
        org_member_status: "ACTIVE",
        joined_at: "2026-01-01T00:00:00Z",
      },
    ],
    total: 1,
    page: 1,
    page_size: 100,
    pages: 1,
  };
}

function adminAuditBody() {
  return {
    items: [
      {
        id: "log-1",
        organization_id: MOCK_COMPANY_ORG.id,
        workspace_id: null,
        user_id: "u-1",
        action: "ADMIN_USERS_VIEWED",
        entity_type: "organization",
        entity_id: null,
        ip_address: "127.0.0.1",
        user_agent: null,
        metadata_json: null,
        created_at: "2026-06-01T12:00:00Z",
      },
    ],
    total: 1,
    page: 1,
    page_size: 100,
    pages: 1,
  };
}

beforeEach(() => {
  fetchMock.mockReset();
  clearTokens();
  setTokens("test-access", "test-refresh");
  vi.stubGlobal("fetch", fetchMock);
});

function mockAdminEndpoints() {
  fetchMock.mockImplementation((url: RequestInfo | URL) => {
    const href = typeof url === "string" ? url : url.toString();
    if (href.includes("/admin/") && href.endsWith("/usage")) {
      return Promise.resolve(jsonResponse(adminUsageBody()));
    }
    if (href.includes("/admin/") && href.includes("/users")) {
      return Promise.resolve(jsonResponse(adminUsersBody()));
    }
    if (href.includes("/admin/") && href.includes("/audit-logs")) {
      return Promise.resolve(jsonResponse(adminAuditBody()));
    }
    return Promise.resolve(jsonResponse({}, 404));
  });
}

describe("AdminDashboard", () => {
  it("renders organization name and Admin label", async () => {
    mockAdminEndpoints();
    render(
      <AdminDashboard
        organizationId={MOCK_COMPANY_ORG.id}
        org={MOCK_COMPANY_ORG}
        currentUserRole="OWNER"
      />
    );
    expect(screen.getByText(MOCK_COMPANY_ORG.name)).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(
      screen.getByText(/Manage organization users, usage, and activity/i)
    ).toBeInTheDocument();
  });

  it("starts on Overview tab and loads usage from backend", async () => {
    mockAdminEndpoints();
    render(
      <AdminDashboard
        organizationId={MOCK_COMPANY_ORG.id}
        org={MOCK_COMPANY_ORG}
        currentUserRole="OWNER"
      />
    );
    await waitFor(() => expect(screen.getByText("Storage Used")).toBeInTheDocument());
    expect(screen.getByText("Active Users")).toBeInTheDocument();
    expect(screen.getByText(/total members/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalled();
  });

  it("switches to Users tab and shows member rows from backend", async () => {
    mockAdminEndpoints();
    render(
      <AdminDashboard
        organizationId={MOCK_COMPANY_ORG.id}
        org={MOCK_COMPANY_ORG}
        currentUserRole="OWNER"
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /^Users$/ }));
    await waitFor(() => expect(screen.getByText("Members")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(/Test Admin/i)).toBeInTheDocument());
  });

  it("switches to Audit Logs tab and shows action filter", async () => {
    mockAdminEndpoints();
    render(
      <AdminDashboard
        organizationId={MOCK_COMPANY_ORG.id}
        org={MOCK_COMPANY_ORG}
        currentUserRole="OWNER"
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Audit Logs/i }));
    await waitFor(() => expect(screen.getByText(/events shown/i)).toBeInTheDocument());
    expect(screen.getByLabelText(/filter by action/i)).toBeInTheDocument();
  });

  it("shows 403 access-denied state when backend forbids admin", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: { code: "FORBIDDEN", message: "Forbidden (HTTP_403)" } }, 403)
    );
    render(
      <AdminDashboard
        organizationId={MOCK_COMPANY_ORG.id}
        org={MOCK_COMPANY_ORG}
        currentUserRole="MEMBER"
      />
    );
    await waitFor(() =>
      expect(screen.getByText(/do not have admin access/i)).toBeInTheDocument()
    );
  });
});
