import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { GuestGuard } from "@/components/auth/GuestGuard";
import { AuthProvider } from "@/lib/auth/auth-context";
import { setTokens, clearTokens } from "@/lib/auth/token-store";

const replaceMock = vi.fn();
const fetchMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: replaceMock,
    prefetch: vi.fn(),
  }),
}));

beforeEach(() => {
  replaceMock.mockReset();
  fetchMock.mockReset();
  clearTokens();
  vi.stubGlobal("fetch", fetchMock);
});

function renderAuthed(child: React.ReactNode) {
  setTokens("test-access", "test-refresh");
  fetchMock.mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        id: "u-1",
        full_name: "Test User",
        email: "test@marijoa.dev",
        avatar_url: null,
        is_active: true,
        is_verified: true,
        created_at: "2026-01-01T00:00:00Z",
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    )
  );
  return render(<AuthProvider>{child}</AuthProvider>);
}

function renderUnauthed(child: React.ReactNode) {
  clearTokens();
  return render(<AuthProvider>{child}</AuthProvider>);
}

describe("AuthGuard", () => {
  it("redirects unauthenticated users to /login", async () => {
    renderUnauthed(
      <AuthGuard>
        <div>secret</div>
      </AuthGuard>
    );
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/login"));
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
  });

  it("renders children when authenticated", async () => {
    renderAuthed(
      <AuthGuard>
        <div>secret</div>
      </AuthGuard>
    );
    await waitFor(() => expect(screen.getByText("secret")).toBeInTheDocument());
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("respects a custom redirectTo", async () => {
    renderUnauthed(
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
    renderAuthed(
      <GuestGuard>
        <div>public</div>
      </GuestGuard>
    );
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/chat"));
    expect(screen.queryByText("public")).not.toBeInTheDocument();
  });

  it("renders children when unauthenticated", async () => {
    renderUnauthed(
      <GuestGuard>
        <div>public</div>
      </GuestGuard>
    );
    await waitFor(() => expect(screen.getByText("public")).toBeInTheDocument());
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
