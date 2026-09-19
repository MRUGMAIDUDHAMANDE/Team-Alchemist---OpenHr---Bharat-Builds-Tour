"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { AccountCard } from "@/components/profile/account-card";
import { ProfileCard } from "@/components/profile/profile-card";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-heading text-xl font-semibold tracking-tight">Profile</h1>
          <p className="text-sm text-muted-foreground">Seekers see the public version of this profile.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link href={`/u/${user.userId}`}>View public profile</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/profile/edit">Edit profile</Link>
          </Button>
        </div>
      </div>

      <ProfileCard profile={user} />
      <AccountCard user={user} />
    </div>
  );
}
