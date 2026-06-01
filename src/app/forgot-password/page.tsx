import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { GuestGuard } from "@/components/auth/GuestGuard";

export const metadata: Metadata = {
  title: "Reset password — Marijoa",
  description: "Reset your Marijoa account password.",
};

export default function ForgotPasswordPage() {
  return (
    <GuestGuard>
      <AuthLayout>
        <ForgotPasswordForm />
      </AuthLayout>
    </GuestGuard>
  );
}
