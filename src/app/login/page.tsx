import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";
import { GuestGuard } from "@/components/auth/GuestGuard";

export const metadata: Metadata = {
  title: "Sign in — Marijoa",
  description: "Sign in to your Marijoa private AI workspace.",
};

export default function LoginPage() {
  return (
    <GuestGuard>
      <AuthLayout>
        <LoginForm />
      </AuthLayout>
    </GuestGuard>
  );
}
