import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sidebar } from "@/components/layout/Sidebar";

describe("Sidebar", () => {
  it("renders the Marijoa brand text", () => {
    render(<Sidebar />);
    expect(screen.getByText("Marijoa")).toBeInTheDocument();
  });

  it("does NOT render 'Indus' anywhere", () => {
    render(<Sidebar />);
    expect(screen.queryByText("Indus")).not.toBeInTheDocument();
  });

  it("renders the New Chat button", () => {
    render(<Sidebar />);
    expect(
      screen.getByRole("button", { name: /start a new chat/i })
    ).toBeInTheDocument();
    expect(screen.getByText("New Chat")).toBeInTheDocument();
  });

  it("renders the Search Chats row", () => {
    render(<Sidebar />);
    expect(
      screen.getByRole("button", { name: /search chat history/i })
    ).toBeInTheDocument();
    expect(screen.getByText("Search Chats")).toBeInTheDocument();
  });

  it("renders all four chat history items", () => {
    render(<Sidebar />);
    expect(screen.getByText("Current Affairs Today")).toBeInTheDocument();
    expect(screen.getByText("Universe Observer Qu...")).toBeInTheDocument();
    expect(screen.getByText("Graph Cycles Analysis ...")).toBeInTheDocument();
    expect(screen.getByText("Hello Greeting")).toBeInTheDocument();
  });

  it("renders the Kakasi Hatake user profile", () => {
    render(<Sidebar />);
    expect(screen.getByText("Kakasi Hatake")).toBeInTheDocument();
  });

  it("renders the user avatar with initials KH", () => {
    render(<Sidebar />);
    expect(screen.getByText("KH")).toBeInTheDocument();
  });

  it("renders the collapse sidebar button", () => {
    render(<Sidebar />);
    expect(
      screen.getByRole("button", { name: /collapse sidebar/i })
    ).toBeInTheDocument();
  });
});
