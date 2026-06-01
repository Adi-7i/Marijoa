import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignupForm } from "@/components/auth/SignupForm";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { PasswordStrengthHint } from "@/components/auth/PasswordStrengthHint";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), prefetch: vi.fn() }),
}));

beforeEach(() => {
  pushMock.mockReset();
  localStorage.clear();
});

describe("LoginForm", () => {
  it("renders email and password fields", () => {
    render(<LoginForm />);
    expect(screen.getByRole("heading", { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("shows validation errors on empty submit", () => {
    render(<LoginForm />);
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("navigates to / on mock success", async () => {
    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "kakashi@konoha.dev" },
    });
    fireEvent.change(screen.getByLabelText(/^password/i), {
      target: { value: "anything" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/chat"), {
      timeout: 2000,
    });
  });
});

describe("SignupForm", () => {
  it("renders all signup fields", () => {
    render(<SignupForm />);
    expect(screen.getByRole("heading", { name: /create your workspace/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it("flags mismatched passwords on submit", () => {
    render(<SignupForm />);
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Naruto" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "n@k.co" } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: "abcd1234" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "different1" } });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    expect(screen.getByText(/do not match/i)).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("submits successfully when valid", async () => {
    render(<SignupForm />);
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Naruto Uzumaki" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "naruto@konoha.dev" } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: "abcd1234" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "abcd1234" } });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/chat"), { timeout: 2000 });
  });
});

describe("ForgotPasswordForm", () => {
  it("shows success card after valid submission", async () => {
    render(<ForgotPasswordForm />);
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "a@b.co" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));
    await waitFor(() =>
      expect(screen.getByText(/check your email/i)).toBeInTheDocument()
    );
    expect(screen.getByText(/will be connected during backend integration/i)).toBeInTheDocument();
  });

  it("rejects invalid email", () => {
    render(<ForgotPasswordForm />);
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
