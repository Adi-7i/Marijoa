import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { InviteAcceptForm } from "@/components/auth/InviteAcceptForm";

export const metadata: Metadata = {
  title: "Accept invitation — Marijoa",
  description: "Accept your invitation to join a Marijoa organization.",
};

interface InviteAcceptPageProps {
  params: Promise<{ token: string }>;
}

export default async function InviteAcceptPage({ params }: InviteAcceptPageProps) {
  const { token } = await params;
  return (
    <AuthLayout>
      <InviteAcceptForm token={token} />
    </AuthLayout>
  );
}
