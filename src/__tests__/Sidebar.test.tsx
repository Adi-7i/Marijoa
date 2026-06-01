import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MOCK_USER, MOCK_CHATS, MOCK_WORKSPACES, MOCK_ORGANIZATIONS } from "@/lib/mock/mock-data";

const personalChats = MOCK_CHATS.filter((c) => c.organizationId === "org-personal");
const personalWorkspaces = MOCK_WORKSPACES.filter((w) => w.organizationId === "org-personal");
const cynerzaChats = MOCK_CHATS.filter((c) => c.organizationId === "org-cynerza");
const cynerzaWorkspaces = MOCK_WORKSPACES.filter((w) => w.organizationId === "org-cynerza");
const cynerzaOrg = MOCK_ORGANIZATIONS.find((o) => o.id === "org-cynerza")!;

describe("Sidebar", () => {
  it("renders the Marijoa brand text", () => {
    render(<Sidebar user={MOCK_USER} chats={personalChats} />);
    expect(screen.getByText("Marijoa")).toBeInTheDocument();
  });

  it("does NOT render 'Indus' anywhere", () => {
    render(<Sidebar user={MOCK_USER} chats={personalChats} />);
    expect(screen.queryByText("Indus")).not.toBeInTheDocument();
  });

  it("renders the New Chat button", () => {
    render(<Sidebar user={MOCK_USER} chats={personalChats} />);
    expect(screen.getByRole("button", { name: /start a new chat/i })).toBeInTheDocument();
    expect(screen.getByText("New Chat")).toBeInTheDocument();
  });

  it("renders the Search Chats row", () => {
    render(<Sidebar user={MOCK_USER} chats={personalChats} />);
    expect(screen.getByRole("button", { name: /search chat history/i })).toBeInTheDocument();
    expect(screen.getByText("Search Chats")).toBeInTheDocument();
  });

  it("renders chats passed as props", () => {
    render(<Sidebar user={MOCK_USER} chats={personalChats} />);
    expect(screen.getByText("Current Affairs Today")).toBeInTheDocument();
    expect(screen.getByText("Universe Observer Questions")).toBeInTheDocument();
  });

  it("renders user name from props", () => {
    render(<Sidebar user={MOCK_USER} chats={personalChats} />);
    expect(screen.getByText(MOCK_USER.name)).toBeInTheDocument();
  });

  it("renders user avatar initials from props", () => {
    render(<Sidebar user={MOCK_USER} chats={personalChats} />);
    expect(screen.getByText(MOCK_USER.initials)).toBeInTheDocument();
  });

  it("renders the collapse sidebar button", () => {
    render(<Sidebar user={MOCK_USER} chats={personalChats} />);
    expect(screen.getByRole("button", { name: /collapse sidebar/i })).toBeInTheDocument();
  });

  it("renders mode switcher when onModeChange is provided", () => {
    render(
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
    render(
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
    render(
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
    render(
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
    render(<Sidebar user={MOCK_USER} chats={personalChats} mode="personal" />);
    expect(
      screen.queryByRole("button", { name: /organization admin dashboard/i })
    ).not.toBeInTheDocument();
  });
});
