import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { GuestGuard } from "@/components/auth/GuestGuard";
import { mockLogin, mockLogout } from "@/lib/mock/mock-auth";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: replaceMock,
    prefetch: vi.fn(),
  }),
}));

beforeEach(() => {
  replaceMock.mockReset();
  localStorage.clear();
});

describe("AuthGuard", () => {
  it("redirects unauthenticated users to /login", async () => {
    render(
      <AuthGuard>
        <div>secret</div>
      </AuthGuard>
    );
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/login"));
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
  });

  it("renders children when authenticated", async () => {
    await mockLogin("a@b.co", "x");
    render(
      <AuthGuard>
        <div>secret</div>
      </AuthGuard>
    );
    await waitFor(() => expect(screen.getByText("secret")).toBeInTheDocument());
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("respects a custom redirectTo", async () => {
    render(
      <AuthGuard redirectTo="/login?reason=expired">
        <div>secret</div>
      </AuthGuard>
    );
    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith("/login?reason=expired")
    );
  });
});

describe("GuestGuard", () => {
  it("redirects authenticated users to /chat", async () => {
    await mockLogin("a@b.co", "x");
    render(
      <GuestGuard>
        <div>public</div>
      </GuestGuard>
    );
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/chat"));
    expect(screen.queryByText("public")).not.toBeInTheDocument();
  });

  it("renders children when unauthenticated", async () => {
    render(
      <GuestGuard>
        <div>public</div>
      </GuestGuard>
    );
    await waitFor(() => expect(screen.getByText("public")).toBeInTheDocument());
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("renders children after logout", async () => {
    await mockLogin("a@b.co", "x");
    mockLogout();
    render(
      <GuestGuard>
        <div>public</div>
      </GuestGuard>
    );
    await waitFor(() => expect(screen.getByText("public")).toBeInTheDocument());
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
