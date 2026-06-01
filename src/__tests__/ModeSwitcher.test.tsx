import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModeSwitcher } from "@/components/workspace/ModeSwitcher";

describe("ModeSwitcher", () => {
  it("renders Personal and Org buttons", () => {
    render(<ModeSwitcher mode="personal" onChange={() => undefined} />);
    expect(screen.getByRole("radio", { name: /personal/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /org/i })).toBeInTheDocument();
  });

  it("marks Personal as checked in personal mode", () => {
    render(<ModeSwitcher mode="personal" onChange={() => undefined} />);
    expect(screen.getByRole("radio", { name: /personal/i })).toHaveAttribute(
      "aria-checked",
      "true"
    );
    expect(screen.getByRole("radio", { name: /org/i })).toHaveAttribute(
      "aria-checked",
      "false"
    );
  });

  it("marks Org as checked in organization mode", () => {
    render(<ModeSwitcher mode="organization" onChange={() => undefined} />);
    expect(screen.getByRole("radio", { name: /org/i })).toHaveAttribute(
      "aria-checked",
      "true"
    );
    expect(screen.getByRole("radio", { name: /personal/i })).toHaveAttribute(
      "aria-checked",
      "false"
    );
  });

  it("calls onChange with organization when Org is clicked", async () => {
    const onChange = vi.fn();
    render(<ModeSwitcher mode="personal" onChange={onChange} />);
    await userEvent.click(screen.getByRole("radio", { name: /org/i }));
    expect(onChange).toHaveBeenCalledWith("organization");
  });

  it("calls onChange with personal when Personal is clicked", async () => {
    const onChange = vi.fn();
    render(<ModeSwitcher mode="organization" onChange={onChange} />);
    await userEvent.click(screen.getByRole("radio", { name: /personal/i }));
    expect(onChange).toHaveBeenCalledWith("personal");
  });
});
