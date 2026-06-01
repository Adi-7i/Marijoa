import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MainChatPanel } from "@/components/layout/MainChatPanel";

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
