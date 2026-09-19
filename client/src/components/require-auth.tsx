"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";

/**
 * Client-side guard for the authenticated app shell. This is a UX guard; the
 * authoritative check is the API verifying the Cognito token on every request,
 * plus the optimistic redirect in proxy.ts.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [status, router, pathname]);

  if (status !== "authenticated") {
    return (
      <div className="flex flex-1 items-center justify-center py-24 text-muted-foreground">
        <Loader2Icon className="size-5 animate-spin" />
        <span className="sr-only">Loading your account</span>
      </div>
    );
  }

  return <>{children}</>;
}
