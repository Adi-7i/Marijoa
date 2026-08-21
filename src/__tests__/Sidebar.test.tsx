import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Sidebar } from "@/components/layout/Sidebar";
import { AuthProvider } from "@/lib/auth/auth-context";
import { clearTokens } from "@/lib/auth/token-store";
import { MOCK_USER, MOCK_CHATS, MOCK_WORKSPACES, MOCK_ORGANIZATIONS } from "@/lib/mock/mock-data";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

beforeEach(() => {
  clearTokens();
  vi.stubGlobal("fetch", vi.fn());
});

function renderSidebar(node: React.ReactNode) {
  return render(<AuthProvider>{node}</AuthProvider>);
}

const personalChats = MOCK_CHATS.filter((c) => c.organizationId === "org-personal");
const personalWorkspaces = MOCK_WORKSPACES.filter((w) => w.organizationId === "org-personal");
const cynerzaChats = MOCK_CHATS.filter((c) => c.organizationId === "org-cynerza");
const cynerzaWorkspaces = MOCK_WORKSPACES.filter((w) => w.organizationId === "org-cynerza");
const cynerzaOrg = MOCK_ORGANIZATIONS.find((o) => o.id === "org-cynerza")!;

describe("Sidebar", () => {
  it("renders the Marijoa brand text", () => {
    renderSidebar(<Sidebar user={MOCK_USER} chats={personalChats} />);
    expect(screen.getByText("Marijoa")).toBeInTheDocument();
  });

  it("renders the New Chat button", () => {
    renderSidebar(<Sidebar user={MOCK_USER} chats={personalChats} />);
    expect(screen.getByRole("button", { name: /start a new chat/i })).toBeInTheDocument();
    expect(screen.getByText("New Chat")).toBeInTheDocument();
  });

  it("renders the Search Chats row", () => {
    renderSidebar(<Sidebar user={MOCK_USER} chats={personalChats} />);
    expect(screen.getByRole("button", { name: /search chat history/i })).toBeInTheDocument();
    expect(screen.getByText("Search Chats")).toBeInTheDocument();
  });

  it("renders chats passed as props", () => {
    renderSidebar(<Sidebar user={MOCK_USER} chats={personalChats} />);
    expect(screen.getByText("Current Affairs Today")).toBeInTheDocument();
    expect(screen.getByText("Universe Observer Questions")).toBeInTheDocument();
  });

  it("selects a chat history item with the correct chat id", async () => {
    const onChatSelect = vi.fn();
    renderSidebar(
      <Sidebar
        user={MOCK_USER}
        chats={personalChats}
        selectedChatId={personalChats[0]?.id}
        onChatSelect={onChatSelect}
      />
    );

    await userEvent.click(screen.getByText(personalChats[1]!.title));

    expect(onChatSelect).toHaveBeenCalledWith(personalChats[1]!.id);
  });

  it("renders user name from props", () => {
    renderSidebar(<Sidebar user={MOCK_USER} chats={personalChats} />);
    expect(screen.getByText(MOCK_USER.name)).toBeInTheDocument();
  });

  it("renders user avatar initials from props", () => {
    renderSidebar(<Sidebar user={MOCK_USER} chats={personalChats} />);
    expect(screen.getByText(MOCK_USER.initials)).toBeInTheDocument();
  });

  it("renders the collapse sidebar button", () => {
    renderSidebar(<Sidebar user={MOCK_USER} chats={personalChats} />);
    expect(screen.getByRole("button", { name: /collapse sidebar/i })).toBeInTheDocument();
  });

  it("renders mode switcher when onModeChange is provided", () => {
    renderSidebar(
      <Sidebar
        user={MOCK_USER}
        chats={personalChats}
        mode="personal"
        onModeChange={() => undefined}
      />
    );
    expect(screen.getByRole("group", { name: /switch workspace mode/i })).toBeInTheDocument();
  });

  it("renders workspace list in organization mode", () => {
    renderSidebar(
      <Sidebar
        user={MOCK_USER}
        chats={cynerzaChats}
        mode="organization"
        onModeChange={() => undefined}
        organizations={[cynerzaOrg]}
        selectedOrgId="org-cynerza"
        workspaces={cynerzaWorkspaces}
        selectedWorkspaceId="ws-cynerza-sales"
        onWorkspaceChange={() => undefined}
      />
    );
    expect(
      screen.getByRole("list", { name: /organization workspaces/i })
    ).toBeInTheDocument();
  });

  it("renders workspace names in org mode sidebar", () => {
    renderSidebar(
      <Sidebar
        user={MOCK_USER}
        chats={cynerzaChats}
        mode="organization"
        onModeChange={() => undefined}
        organizations={[cynerzaOrg]}
        selectedOrgId="org-cynerza"
        workspaces={cynerzaWorkspaces}
        selectedWorkspaceId="ws-cynerza-sales"
        onWorkspaceChange={() => undefined}
      />
    );
    expect(screen.getByRole("button", { name: /Sales Team workspace/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tech Team workspace/i })).toBeInTheDocument();
  });

  it("renders admin link in organization mode", () => {
    renderSidebar(
      <Sidebar
        user={MOCK_USER}
        chats={[]}
        mode="organization"
        workspaces={personalWorkspaces}
      />
    );
    expect(
      screen.getByRole("button", { name: /organization admin dashboard/i })
    ).toBeInTheDocument();
  });

  it("does NOT render admin link in personal mode", () => {
    renderSidebar(<Sidebar user={MOCK_USER} chats={personalChats} mode="personal" />);
    expect(
      screen.queryByRole("button", { name: /organization admin dashboard/i })
    ).not.toBeInTheDocument();
  });
});
