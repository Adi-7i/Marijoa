import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignupForm } from "@/components/auth/SignupForm";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { PasswordStrengthHint } from "@/components/auth/PasswordStrengthHint";
import { AuthProvider } from "@/lib/auth/auth-context";
import { clearTokens } from "@/lib/auth/token-store";

const replaceMock = vi.fn();
const fetchMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock, prefetch: vi.fn() }),
}));

function renderWithAuth(child: React.ReactNode) {
  return render(<AuthProvider>{child}</AuthProvider>);
}

function authPayload(name: string, email: string) {
  return {
    user: {
      id: "u-1",
      full_name: name,
      email,
      avatar_url: null,
      is_active: true,
      is_verified: true,
      created_at: "2026-01-01T00:00:00Z",
    },
    access_token: "a.b.c",
    refresh_token: "r.r.r",
    token_type: "bearer",
    expires_in: 1800,
  };
}

beforeEach(() => {
  replaceMock.mockReset();
  fetchMock.mockReset();
  clearTokens();
  vi.stubGlobal("fetch", fetchMock);
});

describe("LoginForm", () => {
  it("renders email and password fields", () => {
    renderWithAuth(<LoginForm />);
    expect(screen.getByRole("heading", { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("shows validation errors on empty submit", () => {
    renderWithAuth(<LoginForm />);
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("calls POST /auth/login and redirects on success", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(authPayload("Kakashi Hatake", "kakashi@konoha.dev")), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
    renderWithAuth(<LoginForm />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "kakashi@konoha.dev" } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: "anything" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/chat"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/auth\/login$/);
    expect((init as RequestInit).method).toBe("POST");
  });

  it("renders the backend error message on 401", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: { code: "AUTH_INVALID_CREDENTIALS", message: "Bad creds" } }),
        { status: 401, headers: { "content-type": "application/json" } }
      )
    );
    renderWithAuth(<LoginForm />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "x@y.co" } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: "xxxxxxxx" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() =>
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument()
    );
  });
});

describe("SignupForm", () => {
  it("renders all signup fields", () => {
    renderWithAuth(<SignupForm />);
    expect(screen.getByRole("heading", { name: /create your workspace/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it("flags mismatched passwords on submit", () => {
    renderWithAuth(<SignupForm />);
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Naruto" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "n@k.co" } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: "abcd1234" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "different1" } });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    expect(screen.getByText(/do not match/i)).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("calls POST /auth/register and redirects on success", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(authPayload("Naruto Uzumaki", "naruto@konoha.dev")), {
        status: 201,
        headers: { "content-type": "application/json" },
      })
    );
    renderWithAuth(<SignupForm />);
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Naruto Uzumaki" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "naruto@konoha.dev" } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: "abcd1234" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "abcd1234" } });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/chat"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/auth\/register$/);
  });
});

describe("ForgotPasswordForm", () => {
  it("shows success card after valid submission", async () => {
    renderWithAuth(<ForgotPasswordForm />);
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "a@b.co" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));
    await waitFor(() =>
      expect(screen.getByText(/check your email/i)).toBeInTheDocument()
    );
  });

  it("rejects invalid email", () => {
    renderWithAuth(<ForgotPasswordForm />);
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});

describe("PasswordStrengthHint", () => {
  it("shows empty state when password is empty", () => {
    render(<PasswordStrengthHint value="" />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("reflects Strong label for a strong password", () => {
    render(<PasswordStrengthHint value="Abcdef1!" />);
    expect(screen.getByText("Strong")).toBeInTheDocument();
  });
});
