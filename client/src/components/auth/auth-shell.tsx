import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface AuthShellProps {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function AuthShell({ title, description, children, footer, className }: AuthShellProps) {
  return (
    <div className={cn("w-full max-w-sm", className)}>
      <div className="mb-6 space-y-1.5">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold">
          <span className="grid size-6 place-items-center rounded-md bg-primary text-primary-foreground">
            <span className="text-xs font-bold">O</span>
          </span>
          OpenHR
        </Link>
        <h1 className="font-heading text-xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">{children}</div>

      {footer ? <div className="mt-4 text-sm text-muted-foreground">{footer}</div> : null}
    </div>
  );
}
