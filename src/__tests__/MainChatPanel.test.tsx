import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MainChatPanel } from "@/components/layout/MainChatPanel";
import type { Chat, Message } from "@/types/marijoa";

const apiMocks = vi.hoisted(() => ({
  createChat: vi.fn(),
  listMessages: vi.fn(),
  streamAIResponse: vi.fn(),
  createResearchSession: vi.fn(),
  cancelResearchSession: vi.fn(),
  exportResearchPdf: vi.fn(),
  getResearchReport: vi.fn(),
  getResearchSession: vi.fn(),
  openResearchPdfExport: vi.fn(),
  startResearchSession: vi.fn(),
  streamResearchEvents: vi.fn(),
}));

vi.mock("@/lib/api/chats", () => ({
  createChat: apiMocks.createChat,
}));

vi.mock("@/lib/api/messages", () => ({
  listMessages: apiMocks.listMessages,
}));

vi.mock("@/lib/api/ai", () => ({
  streamAIResponse: apiMocks.streamAIResponse,
}));

vi.mock("@/lib/api/deepResearch", () => ({
  cancelResearchSession: apiMocks.cancelResearchSession,
  createResearchSession: apiMocks.createResearchSession,
  exportResearchPdf: apiMocks.exportResearchPdf,
  getResearchReport: apiMocks.getResearchReport,
  getResearchSession: apiMocks.getResearchSession,
  openResearchPdfExport: apiMocks.openResearchPdfExport,
  startResearchSession: apiMocks.startResearchSession,
  streamResearchEvents: apiMocks.streamResearchEvents,
}));

const createdChat: Chat = {
  id: "chat-created",
  workspaceId: "workspace-1",
  organizationId: "org-1",
  title: "hi",
  updatedAt: Date.now(),
  messageCount: 0,
};

const historyMessages: Message[] = [
  {
    id: "message-user",
    chatId: "chat-history",
    role: "user",
    content: "What did we discuss?",
    timestamp: Date.parse("2026-06-02T06:00:00Z"),
  },
  {
    id: "message-assistant",
    chatId: "chat-history",
    role: "assistant",
    content: "We discussed the launch plan.",
    timestamp: Date.parse("2026-06-02T06:00:01Z"),
  },
];

beforeEach(() => {
  for (const mock of Object.values(apiMocks)) mock.mockReset();
  apiMocks.listMessages.mockResolvedValue({ items: [], total: 0 });
  apiMocks.createChat.mockResolvedValue(createdChat);
  apiMocks.streamAIResponse.mockImplementation(async (_chatId, _content, handlers) => {
    handlers.onStart?.({ chatId: "chat-created", userMessageId: "message-user-created" });
    handlers.onToken?.("Hello from the normal AI stream.");
    handlers.onDone?.({
      chatId: "chat-created",
      messageId: "message-assistant-created",
      webSearchUsed: false,
    });
  });
  apiMocks.createResearchSession.mockResolvedValue({
    sessionId: "research-session",
    query: "research India history",
    title: "Research: India history",
    status: "PLANNED",
    objectives: ["Build timeline"],
    searchQueries: ["India history sources"],
    steps: [],
    createdAt: Date.now(),
  });
});

describe("MainChatPanel — empty state (no chat selected)", () => {
  it("renders the greeting heading", () => {
    render(<MainChatPanel />);
    // aria-label is USER_GREETING; text content is the fallback prompt
    expect(
      screen.getByRole("heading", { name: /welcome to marijoa/i })
    ).toBeInTheDocument();
  });

  it("renders the chat composer input", () => {
    render(<MainChatPanel />);
    expect(
      screen.getByRole("textbox", { name: /chat message/i })
    ).toBeInTheDocument();
  });

  it('renders the placeholder "Ask me anything..."', () => {
    render(<MainChatPanel />);
    expect(screen.getByPlaceholderText("Ask me anything...")).toBeInTheDocument();
  });

  it("renders the send message button", () => {
    render(<MainChatPanel />);
    expect(screen.getByRole("button", { name: /send message/i })).toBeInTheDocument();
  });

  it("does not render disclaimer in empty state", () => {
    render(<MainChatPanel />);
    expect(screen.queryByText(/human oversight/i)).not.toBeInTheDocument();
  });
});

describe("MainChatPanel — with a selected chat title", () => {
  it("shows the chat title in the header div", () => {
    render(<MainChatPanel chatTitle="Q2 Strategy Planning" />);
    expect(screen.getByText("Q2 Strategy Planning")).toBeInTheDocument();
  });

  it("shows workspace context subtitle when provided", () => {
    render(
      <MainChatPanel
        chatTitle="API Review"
        orgName="Acme Corp"
        workspaceName="Engineering"
      />
    );
    expect(screen.getByText("Acme Corp · Engineering")).toBeInTheDocument();
  });
});

describe("MainChatPanel — send routing", () => {
  it("uses normal chat streaming when Deep Research mode is off", async () => {
    const onChatCreated = vi.fn();
    render(
      <MainChatPanel
        workspaceId="workspace-1"
        organizationId="org-1"
        onChatCreated={onChatCreated}
      />
    );

    await userEvent.type(screen.getByRole("textbox", { name: /chat message/i }), "hi");
    await userEvent.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => expect(apiMocks.streamAIResponse).toHaveBeenCalledTimes(1));
    expect(apiMocks.createChat).toHaveBeenCalledWith({
      workspaceId: "workspace-1",
      organizationId: "org-1",
      title: "hi",
    });
    expect(apiMocks.streamAIResponse).toHaveBeenCalledWith(
      "chat-created",
      "hi",
      expect.objectContaining({ webMode: "auto" })
    );
    expect(apiMocks.createResearchSession).not.toHaveBeenCalled();
    expect(onChatCreated).toHaveBeenCalledWith(createdChat);
    expect(await screen.findByText(/hello from the normal ai stream/i)).toBeInTheDocument();
  });

  it("shows a workspace error instead of clearing app state when normal send has no workspace", async () => {
    render(<MainChatPanel />);

    await userEvent.type(screen.getByRole("textbox", { name: /chat message/i }), "hi");
    await userEvent.click(screen.getByRole("button", { name: /send message/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/select or create a workspace first/i);
    expect(apiMocks.createChat).not.toHaveBeenCalled();
    expect(apiMocks.streamAIResponse).not.toHaveBeenCalled();
    expect(apiMocks.createResearchSession).not.toHaveBeenCalled();
  });

  it("uses Deep Research only after the mode is explicitly enabled", async () => {
    render(<MainChatPanel workspaceId="workspace-1" selectedChatId="chat-1" />);

    await userEvent.click(screen.getByRole("button", { name: /open chat tools/i }));
    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: /deep research/i }));
    expect(screen.getByPlaceholderText("Get a detailed report...")).toBeInTheDocument();

    await userEvent.type(
      screen.getByRole("textbox", { name: /chat message/i }),
      "research India history"
    );
    await userEvent.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => expect(apiMocks.createResearchSession).toHaveBeenCalledTimes(1));
    expect(apiMocks.createResearchSession).toHaveBeenCalledWith({
      workspaceId: "workspace-1",
      chatId: "chat-1",
      query: "research India history",
    });
    expect(apiMocks.streamAIResponse).not.toHaveBeenCalled();
    expect(apiMocks.createChat).not.toHaveBeenCalled();
  });
});

describe("MainChatPanel — chat history loading", () => {
  it("loads messages for the selected chat id", async () => {
    apiMocks.listMessages.mockResolvedValueOnce({
      items: historyMessages,
      total: historyMessages.length,
    });

    render(
      <MainChatPanel
        selectedChatId="chat-history"
        workspaceId="workspace-1"
        chatTitle="Launch Plan"
      />
    );

    await waitFor(() =>
      expect(apiMocks.listMessages).toHaveBeenCalledWith("chat-history", { limit: 200 })
    );
    expect(await screen.findByText("What did we discuss?")).toBeInTheDocument();
    expect(screen.getByText("We discussed the launch plan.")).toBeInTheDocument();
    expect(screen.getByText("Launch Plan")).toBeInTheDocument();
  });
});
