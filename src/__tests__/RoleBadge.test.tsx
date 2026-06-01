import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RoleBadge } from "@/components/organization/RoleBadge";

describe("RoleBadge", () => {
  it("renders Owner label", () => {
    render(<RoleBadge role="OWNER" />);
    expect(screen.getByText("Owner")).toBeInTheDocument();
  });

  it("renders Admin label", () => {
    render(<RoleBadge role="ADMIN" />);
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("renders Manager label", () => {
    render(<RoleBadge role="MANAGER" />);
    expect(screen.getByText("Manager")).toBeInTheDocument();
  });

  it("renders Member label", () => {
    render(<RoleBadge role="MEMBER" />);
    expect(screen.getByText("Member")).toBeInTheDocument();
  });

  it("renders Viewer label", () => {
    render(<RoleBadge role="VIEWER" />);
    expect(screen.getByText("Viewer")).toBeInTheDocument();
  });
});
