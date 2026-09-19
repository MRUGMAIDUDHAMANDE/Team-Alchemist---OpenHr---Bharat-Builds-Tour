"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Loader2Icon } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated" || (status === "authenticated" && user?.role !== "ADMIN")) {
      router.replace("/dashboard");
    }
  }, [status, user, router]);

  if (status !== "authenticated" || user?.role !== "ADMIN") {
    return (
      <div className="flex flex-1 items-center justify-center py-24 text-muted-foreground">
        <Loader2Icon className="size-5 animate-spin" />
        <span className="sr-only">Checking administrator access</span>
      </div>
    );
  }

  return <>{children}</>;
}
