import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ConfirmForm } from "@/components/auth/confirm-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Verify email" };

export default function VerifyPage() {
  return (
    <AuthShell
      title="Verify your email"
      description="Enter the 6-digit code we sent to your inbox."
    >
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <ConfirmForm />
      </Suspense>
    </AuthShell>
  );
}
