import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { COMPOSER_MAX_LENGTH, COMPOSER_PLACEHOLDER } from "@/lib/constants";

describe("ChatComposer", () => {
  /* ── Rendering ──────────────────────────────────────────── */

  it('renders the placeholder "Ask me anything..."', () => {
    render(<ChatComposer />);
    expect(screen.getByPlaceholderText(COMPOSER_PLACEHOLDER)).toBeInTheDocument();
  });

  it("renders accessible label on the input", () => {
    render(<ChatComposer />);
    expect(
      screen.getByRole("textbox", { name: /chat message/i })
    ).toBeInTheDocument();
  });

  it("renders aria-label on send button", () => {
    render(<ChatComposer />);
    expect(
      screen.getByRole("button", { name: /send message/i })
    ).toBeInTheDocument();
  });

  it("renders aria-label on voice input button", () => {
    render(<ChatComposer />);
    expect(
      screen.getByRole("button", { name: /voice input/i })
    ).toBeInTheDocument();
  });

  it("renders aria-label on plus button", () => {
    render(<ChatComposer />);
    expect(
      screen.getByRole("button", { name: /attach a file/i })
    ).toBeInTheDocument();
  });

  /* ── Validation ─────────────────────────────────────────── */

  it("does not call onSend and shows error for empty submit", async () => {
    const onSend = vi.fn();
    render(<ChatComposer onSend={onSend} />);
    const sendBtn = screen.getByRole("button", { name: /send message/i });

    await userEvent.click(sendBtn);

    expect(onSend).not.toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toHaveTextContent(/cannot be empty/i);
  });

  it("does not call onSend for whitespace-only input", async () => {
    const onSend = vi.fn();
    render(<ChatComposer onSend={onSend} />);
    const input = screen.getByRole("textbox", { name: /chat message/i });

    await userEvent.type(input, "   ");
    await userEvent.click(screen.getByRole("button", { name: /send message/i }));

    expect(onSend).not.toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toHaveTextContent(/cannot be empty/i);
  });

  it("calls onSend with trimmed message for valid input", async () => {
    const onSend = vi.fn();
    render(<ChatComposer onSend={onSend} />);
    const input = screen.getByRole("textbox", { name: /chat message/i });

    await userEvent.type(input, "  Hello world  ");
    await userEvent.click(screen.getByRole("button", { name: /send message/i }));

    expect(onSend).toHaveBeenCalledWith("Hello world");
  });

  it("submits on Enter key and clears input", async () => {
    const onSend = vi.fn();
    render(<ChatComposer onSend={onSend} />);
    const input = screen.getByRole("textbox", { name: /chat message/i });

    await userEvent.type(input, "Hello from Vitest{Enter}");

    expect(onSend).toHaveBeenCalledWith("Hello from Vitest");
    await waitFor(() => expect(input).toHaveValue(""));
  });

  it("enforces max length via HTML maxLength attribute", () => {
    render(<ChatComposer />);
    const input = screen.getByRole("textbox", { name: /chat message/i });
    expect(input).toHaveAttribute("maxLength", String(COMPOSER_MAX_LENGTH));
  });

  it("clears error when user starts typing after validation failure", async () => {
    render(<ChatComposer />);
    await userEvent.click(screen.getByRole("button", { name: /send message/i }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    const input = screen.getByRole("textbox", { name: /chat message/i });
    await userEvent.type(input, "a");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("calls onAttach when Plus button is clicked", async () => {
    const onAttach = vi.fn();
    render(<ChatComposer onAttach={onAttach} />);
    await userEvent.click(
      screen.getByRole("button", { name: /attach a file/i })
    );
    expect(onAttach).toHaveBeenCalledOnce();
  });

  it("Plus button never triggers onSend (must not submit the message)", async () => {
    const onSend = vi.fn();
    render(<ChatComposer onSend={onSend} />);
    await userEvent.click(
      screen.getByRole("button", { name: /attach a file/i })
    );
    expect(onSend).not.toHaveBeenCalled();
  });
});

// Removed: "active chat state (demo behavior)" tests.
// The demo assistant streaming has been replaced by the real backend AI Gateway.
// Streaming behavior is covered by sse-parse.test.ts and api-client.test.ts.
