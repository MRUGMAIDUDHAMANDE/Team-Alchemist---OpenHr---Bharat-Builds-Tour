"use client";

import Link from "next/link";
import {
  BadgeCheckIcon,
  CircleIcon,
  CircleCheckIcon,
  ClockIcon,
  MailIcon,
  ShieldIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatMemberSince(iso: string) {
  return iso.slice(0, 10);
}

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) return null;

  const firstName = user.name.split(" ")[0];
  const profileComplete = Boolean(user.bio && user.skills.length > 0 && user.hourlyRate);

  const setupSteps = [
    {
      label: "Verify your email",
      description: "Confirm the code sent to your inbox.",
      done: user.status === "ACTIVE",
    },
    {
      label: "Complete your profile",
      description: "Add a bio, skills and an hourly rate.",
      done: profileComplete,
    },
    {
      label: "Publish your first availability",
      description: "Tell seekers when you are free.",
      done: false,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="space-y-1">
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          Welcome back, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Your account is ready. The marketplace modules land in the next milestones.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
          <h2 className="font-heading text-sm font-medium">Account</h2>
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
              <dd className="font-medium">{formatMemberSince(user.createdAt)}</dd>
            </div>
          </dl>

          <div className="mt-5 border-t pt-4">
            <Button size="sm" variant="outline" asChild>
              <Link href="/">Back to home</Link>
            </Button>
          </div>
        </section>

        <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
          <h2 className="font-heading text-sm font-medium">Getting started</h2>
          <ul className="mt-4 space-y-3">
            {setupSteps.map((step) => (
              <li key={step.label} className="flex items-start gap-3">
                {step.done ? (
                  <CircleCheckIcon className="mt-0.5 size-4 shrink-0 text-success" />
                ) : (
                  <CircleIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                )}
                <div className={cn(step.done && "text-muted-foreground")}>
                  <p className="text-sm font-medium">{step.label}</p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
