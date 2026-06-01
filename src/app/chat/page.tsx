import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { AuthGuard } from "@/components/auth/AuthGuard";

export const metadata: Metadata = {
  title: "Marijoa — Workspace",
};

export default function ChatPage() {
  return (
    <AuthGuard>
      <AppShell />
    </AuthGuard>
  );
}
