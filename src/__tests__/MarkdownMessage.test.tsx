import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarkdownMessage } from "@/components/chat/MarkdownMessage";

describe("MarkdownMessage", () => {
  it("renders an h1 heading", () => {
    render(<MarkdownMessage content={"# Hello world"} />);
    const heading = screen.getByRole("heading", { level: 1, name: /hello world/i });
    expect(heading).toBeInTheDocument();
  });

  it("renders a bullet list", () => {
    render(
      <MarkdownMessage
        content={"- alpha\n- beta\n- gamma"}
      />,
    );
    const list = screen.getByRole("list");
    expect(list.tagName.toLowerCase()).toBe("ul");
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent(/alpha/);
    expect(items[2]).toHaveTextContent(/gamma/);
  });

  it("renders a GFM table with cell content visible", () => {
    const table = [
      "| Name | Score |",
      "| ---- | ----- |",
      "| Ada  | 99    |",
      "| Lin  | 42    |",
    ].join("\n");
    render(<MarkdownMessage content={table} />);
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /name/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /score/i })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: /ada/i })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: /99/ })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: /lin/i })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: /42/ })).toBeInTheDocument();
  });

  it("renders a blockquote", () => {
    render(<MarkdownMessage content={"> A wise quote"} />);
    const quote = document.querySelector("blockquote");
    expect(quote).not.toBeNull();
    expect(quote).toHaveTextContent(/a wise quote/i);
  });

  it("does NOT inject raw HTML from the markdown source", () => {
    render(<MarkdownMessage content={"<script>alert(1)</script>\n\nSafe paragraph."} />);
    // No <script> tag should ever be created inside the rendered output.
    expect(document.querySelector("script")).toBeNull();
    // The literal text should still be visible (rendered as plain text).
    expect(screen.getByText(/Safe paragraph\./)).toBeInTheDocument();
  });

  it("does not render an iframe even if the source contains one", () => {
    render(<MarkdownMessage content={"<iframe src='https://evil.example'></iframe>"} />);
    expect(document.querySelector("iframe")).toBeNull();
  });

  it("renders external links with target=_blank and rel=noopener noreferrer", () => {
    render(
      <MarkdownMessage content={"See [docs](https://example.com/docs) for details."} />,
    );
    const link = screen.getByRole("link", { name: /docs/i }) as HTMLAnchorElement;
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("target", "_blank");
    const rel = link.getAttribute("rel") ?? "";
    expect(rel).toMatch(/noopener/);
    expect(rel).toMatch(/noreferrer/);
    expect(link.href).toContain("https://example.com/docs");
  });

  it("does not render an anchor for javascript: hrefs", () => {
    render(
      <MarkdownMessage content={"Click [here](javascript:alert(1)) now."} />,
    );
    expect(screen.queryByRole("link")).toBeNull();
    // The visible text should remain.
    expect(screen.getByText(/here/i)).toBeInTheDocument();
  });

  it("renders inline code differently from fenced code", () => {
    render(
      <MarkdownMessage
        content={"Some `inline` here.\n\n```js\nconst x = 1;\n```"}
      />,
    );
    // Inline code: a <code> element that is NOT inside a <pre>.
    const codes = Array.from(document.querySelectorAll("code"));
    const inline = codes.find((c) => !c.closest("pre"));
    const fenced = codes.find((c) => c.closest("pre"));
    expect(inline).toBeDefined();
    expect(inline).toHaveTextContent("inline");
    expect(fenced).toBeDefined();
    expect(fenced).toHaveTextContent(/const x = 1;/);
  });
});
