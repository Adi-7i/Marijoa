import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MainChatPanel } from "@/components/layout/MainChatPanel";

describe("MainChatPanel — empty state", () => {
  it("renders the Marijoa brand wordmark", () => {
    render(<MainChatPanel />);
    expect(screen.getByText("Marijoa")).toBeInTheDocument();
  });

  it("renders the Hello Kakasi! greeting", () => {
    render(<MainChatPanel />);
    expect(
      screen.getByRole("heading", { name: /hello kakasi/i })
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
    expect(
      screen.getByPlaceholderText("Ask me anything...")
    ).toBeInTheDocument();
  });

  it("renders the send message button", () => {
    render(<MainChatPanel />);
    expect(
      screen.getByRole("button", { name: /send message/i })
    ).toBeInTheDocument();
  });

  it("does not render disclaimer in empty state", () => {
    render(<MainChatPanel />);
    expect(
      screen.queryByText(/human oversight/i)
    ).not.toBeInTheDocument();
  });
});
