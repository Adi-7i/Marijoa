import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton, SkeletonLines } from "@/components/ui/Skeleton";
import { Spinner } from "@/components/ui/Spinner";
import { Notice } from "@/components/ui/Notice";
import { Divider } from "@/components/ui/Divider";
import { Toaster } from "@/components/ui/Toaster";
import { showToast, clearToasts } from "@/lib/toast";

describe("Button", () => {
  it("renders children", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: /click me/i })).toBeInTheDocument();
  });

  it("defaults to type=button", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: /save/i })).toHaveAttribute("type", "button");
  });

  it("respects disabled state and does not invoke onClick", () => {
    let clicked = 0;
    render(
      <Button disabled onClick={() => clicked++}>
        Send
      </Button>
    );
    const btn = screen.getByRole("button", { name: /send/i });
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(clicked).toBe(0);
  });

  it("invokes onClick when enabled", () => {
    let clicked = 0;
    render(<Button onClick={() => clicked++}>Run</Button>);
    fireEvent.click(screen.getByRole("button", { name: /run/i }));
    expect(clicked).toBe(1);
  });

  it("renders different variants without crashing", () => {
    render(
      <>
        <Button variant="primary">P</Button>
        <Button variant="secondary">S</Button>
        <Button variant="ghost">G</Button>
        <Button variant="danger">D</Button>
      </>
    );
    expect(screen.getByRole("button", { name: "P" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "D" })).toBeInTheDocument();
  });
});

describe("Card", () => {
  it("renders children", () => {
    render(
      <Card>
        <span>card body</span>
      </Card>
    );
    expect(screen.getByText("card body")).toBeInTheDocument();
  });

  it("supports interactive variant", () => {
    render(
      <Card interactive>
        <span>tap</span>
      </Card>
    );
    expect(screen.getByText("tap")).toBeInTheDocument();
  });
});

describe("EmptyState", () => {
  it("renders title and description", () => {
    render(<EmptyState title="No data" description="Nothing here yet." />);
    expect(screen.getByText("No data")).toBeInTheDocument();
    expect(screen.getByText(/nothing here yet/i)).toBeInTheDocument();
  });

  it("renders optional action", () => {
    render(
      <EmptyState
        title="Empty"
        action={<button type="button">Add</button>}
      />
    );
    expect(screen.getByRole("button", { name: /add/i })).toBeInTheDocument();
  });

  it("has role=status for screen readers", () => {
    render(<EmptyState title="Empty" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});

describe("Skeleton", () => {
  it("renders a status element with aria-busy", () => {
    render(<Skeleton width={80} height={12} />);
    const el = screen.getByRole("status");
    expect(el).toHaveAttribute("aria-busy", "true");
  });

  it("SkeletonLines renders the requested number of lines", () => {
    render(<SkeletonLines count={4} />);
    const container = screen.getByRole("status");
    expect(container.children.length).toBe(4);
  });
});

describe("Spinner", () => {
  it("renders with default aria-label", () => {
    render(<Spinner />);
    expect(screen.getByRole("status", { name: /loading/i })).toBeInTheDocument();
  });
});

describe("Notice", () => {
  it("renders inline notice content", () => {
    render(<Notice>Heads up</Notice>);
    expect(screen.getByRole("note")).toHaveTextContent(/heads up/i);
  });
});

describe("Divider", () => {
  it("renders as a separator", () => {
    render(<Divider />);
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });

  it("supports vertical orientation", () => {
    render(<Divider orientation="vertical" />);
    expect(screen.getByRole("separator")).toHaveAttribute("aria-orientation", "vertical");
  });
});

describe("Toaster + toast manager", () => {
  beforeEach(() => {
    clearToasts();
  });

  it("renders nothing when empty", () => {
    const { container } = render(<Toaster />);
    expect(container.firstChild).toBeNull();
  });

  it("renders a toast after showToast", () => {
    render(<Toaster />);
    act(() => {
      showToast("Hello world", { duration: 0 });
    });
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("dismisses on close button click", () => {
    render(<Toaster />);
    act(() => {
      showToast("Bye soon", { duration: 0 });
    });
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(screen.queryByText("Bye soon")).not.toBeInTheDocument();
  });

});
