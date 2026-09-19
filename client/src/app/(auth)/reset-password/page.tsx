import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Set a new password" };

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Set a new password"
      description="Enter the code from your email and choose a new password."
    >
      <Suspense fallback={<Skeleton className="h-72 w-full" />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
