import type { ReactNode } from "react";
import Link from "next/link";
import { AppSidebar, MobileNav } from "@/components/app-sidebar";
import { RequireAuth } from "@/components/require-auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <div className="flex min-h-full flex-1">
        <AppSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background/90 px-4 backdrop-blur">
            <Link href="/" className="flex items-center gap-2 font-semibold md:hidden">
              <span className="grid size-6 place-items-center rounded-md bg-primary text-primary-foreground">
                <span className="text-xs font-bold">O</span>
              </span>
              OpenHR
            </Link>
            <div className="ml-auto flex items-center gap-1.5">
              <ThemeToggle />
              <UserMenu />
            </div>
          </header>

          <MobileNav />

          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </RequireAuth>
  );
}
