import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ArtifactTypeBadge } from "@/components/artifacts/ArtifactTypeBadge";

describe("ArtifactTypeBadge", () => {
  it("renders Code label", () => {
    render(<ArtifactTypeBadge type="code" />);
    expect(screen.getByText("Code")).toBeInTheDocument();
  });

  it("renders Document label", () => {
    render(<ArtifactTypeBadge type="document" />);
    expect(screen.getByText("Doc")).toBeInTheDocument();
  });

  it("renders Prompt label", () => {
    render(<ArtifactTypeBadge type="prompt" />);
    expect(screen.getByText("Prompt")).toBeInTheDocument();
  });

  it("renders Email label", () => {
    render(<ArtifactTypeBadge type="email" />);
    expect(screen.getByText("Email")).toBeInTheDocument();
  });

  it("renders Proposal label", () => {
    render(<ArtifactTypeBadge type="proposal" />);
    expect(screen.getByText("Proposal")).toBeInTheDocument();
  });

  it("renders Note label", () => {
    render(<ArtifactTypeBadge type="note" />);
    expect(screen.getByText("Note")).toBeInTheDocument();
  });

  it("renders Chart label", () => {
    render(<ArtifactTypeBadge type="chart" />);
    expect(screen.getByText("Chart")).toBeInTheDocument();
  });

  it("renders Table label", () => {
    render(<ArtifactTypeBadge type="table" />);
    expect(screen.getByText("Table")).toBeInTheDocument();
  });
});
