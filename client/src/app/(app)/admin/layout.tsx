import type { ReactNode } from "react";
import Link from "next/link";
import { RequireAdmin } from "@/components/require-admin";

const sections = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/contact", label: "Contact" },
  { href: "/admin/commission", label: "Commission" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAdmin>
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="space-y-1">
          <h1 className="font-heading text-xl font-semibold tracking-tight">Administration</h1>
          <p className="text-sm text-muted-foreground">Platform integrity, revenue, and support.</p>
        </div>
        <nav className="flex flex-wrap gap-2 border-b pb-3">
          {sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {section.label}
            </Link>
          ))}
        </nav>
        {children}
      </div>
    </RequireAdmin>
  );
}
