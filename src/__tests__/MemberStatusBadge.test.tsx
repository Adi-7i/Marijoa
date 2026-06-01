import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemberStatusBadge } from "@/components/admin/MemberStatusBadge";

describe("MemberStatusBadge", () => {
  it("renders Active label", () => {
    render(<MemberStatusBadge status="ACTIVE" />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("renders Invited label", () => {
    render(<MemberStatusBadge status="INVITED" />);
    expect(screen.getByText("Invited")).toBeInTheDocument();
  });

  it("renders Suspended label", () => {
    render(<MemberStatusBadge status="SUSPENDED" />);
    expect(screen.getByText("Suspended")).toBeInTheDocument();
  });

  it("renders Removed label", () => {
    render(<MemberStatusBadge status="REMOVED" />);
    expect(screen.getByText("Removed")).toBeInTheDocument();
  });
});
