import type { ReactNode } from "react";
import { BadgeCheckIcon, ClockIcon, MailIcon, ShieldIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AuthUser } from "@/lib/auth/types";

interface AccountCardProps {
  user: AuthUser;
  action?: ReactNode;
}

export function AccountCard({ user, action }: AccountCardProps) {
  return (
    <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-heading text-sm font-medium">Account</h2>
        {action}
      </div>
      <dl className="mt-4 space-y-3 text-sm">
        <div className="flex items-center justify-between gap-4">
          <dt className="flex items-center gap-2 text-muted-foreground">
            <MailIcon className="size-4" />
            Email
          </dt>
          <dd className="truncate font-medium">{user.email}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="flex items-center gap-2 text-muted-foreground">
            <ShieldIcon className="size-4" />
            Role
          </dt>
          <dd>
            <Badge variant="outline">{user.role}</Badge>
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="flex items-center gap-2 text-muted-foreground">
            <BadgeCheckIcon className="size-4" />
            Status
          </dt>
          <dd>
            <Badge variant={user.status === "ACTIVE" ? "secondary" : "destructive"}>
              {user.status === "ACTIVE" ? "Active" : user.status}
            </Badge>
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="flex items-center gap-2 text-muted-foreground">
            <ClockIcon className="size-4" />
            Member since
          </dt>
          <dd className="font-medium">{user.createdAt.slice(0, 10)}</dd>
        </div>
      </dl>
    </section>
  );
}
