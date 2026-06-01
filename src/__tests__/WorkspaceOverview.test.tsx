import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WorkspaceOverview } from "@/components/organization/WorkspaceOverview";
import { MOCK_COMPANY_ORG, MOCK_WORKSPACES, MOCK_CHATS, MOCK_MEMBERS } from "@/lib/mock/mock-data";

const salesWorkspace = MOCK_WORKSPACES.find((w) => w.id === "ws-cynerza-sales")!;
const salesChats = MOCK_CHATS.filter((c) => c.workspaceId === "ws-cynerza-sales");
const cynerzaMembers = MOCK_MEMBERS.filter((m) => m.organizationId === "org-cynerza");

describe("WorkspaceOverview", () => {
  it("renders workspace name as heading", () => {
    render(
      <WorkspaceOverview
        workspace={salesWorkspace}
        org={MOCK_COMPANY_ORG}
        chats={salesChats}
        members={cynerzaMembers}
        onSelectChat={() => undefined}
        onNewChat={() => undefined}
      />
    );
    expect(screen.getByRole("heading", { name: salesWorkspace.name })).toBeInTheDocument();
  });

  it("renders organization name", () => {
    render(
      <WorkspaceOverview
        workspace={salesWorkspace}
        org={MOCK_COMPANY_ORG}
        chats={salesChats}
        members={cynerzaMembers}
        onSelectChat={() => undefined}
        onNewChat={() => undefined}
      />
    );
    expect(screen.getByText(MOCK_COMPANY_ORG.name)).toBeInTheDocument();
  });

  it("renders workspace description", () => {
    render(
      <WorkspaceOverview
        workspace={salesWorkspace}
        org={MOCK_COMPANY_ORG}
        chats={salesChats}
        members={cynerzaMembers}
        onSelectChat={() => undefined}
        onNewChat={() => undefined}
      />
    );
    expect(screen.getByText(salesWorkspace.description!)).toBeInTheDocument();
  });

  it("renders chat titles as buttons", () => {
    render(
      <WorkspaceOverview
        workspace={salesWorkspace}
        org={MOCK_COMPANY_ORG}
        chats={salesChats}
        members={cynerzaMembers}
        onSelectChat={() => undefined}
        onNewChat={() => undefined}
      />
    );
    for (const chat of salesChats) {
      expect(screen.getByRole("button", { name: new RegExp(chat.title, "i") })).toBeInTheDocument();
    }
  });

  it("calls onSelectChat when a chat is clicked", () => {
    const onSelectChat = vi.fn();
    render(
      <WorkspaceOverview
        workspace={salesWorkspace}
        org={MOCK_COMPANY_ORG}
        chats={salesChats}
        members={cynerzaMembers}
        onSelectChat={onSelectChat}
        onNewChat={() => undefined}
      />
    );
    const firstChat = salesChats[0];
    fireEvent.click(screen.getByRole("button", { name: new RegExp(firstChat.title, "i") }));
    expect(onSelectChat).toHaveBeenCalledWith(firstChat.id);
  });

  it("renders New Chat button and calls onNewChat", () => {
    const onNewChat = vi.fn();
    render(
      <WorkspaceOverview
        workspace={salesWorkspace}
        org={MOCK_COMPANY_ORG}
        chats={salesChats}
        members={cynerzaMembers}
        onSelectChat={() => undefined}
        onNewChat={onNewChat}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /new chat/i }));
    expect(onNewChat).toHaveBeenCalled();
  });

  it("renders member count", () => {
    render(
      <WorkspaceOverview
        workspace={salesWorkspace}
        org={MOCK_COMPANY_ORG}
        chats={salesChats}
        members={cynerzaMembers}
        onSelectChat={() => undefined}
        onNewChat={() => undefined}
      />
    );
    expect(screen.getByText(`${cynerzaMembers.length} members`)).toBeInTheDocument();
  });

  it("shows empty state when no chats", () => {
    render(
      <WorkspaceOverview
        workspace={salesWorkspace}
        org={MOCK_COMPANY_ORG}
        chats={[]}
        members={cynerzaMembers}
        onSelectChat={() => undefined}
        onNewChat={() => undefined}
      />
    );
    expect(screen.getByText(/no chats yet/i)).toBeInTheDocument();
  });
});
