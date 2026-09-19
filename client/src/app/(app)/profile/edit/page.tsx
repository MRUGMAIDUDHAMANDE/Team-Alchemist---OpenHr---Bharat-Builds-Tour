"use client";

import { useAuth } from "@/lib/auth/auth-context";
import { ProfileForm } from "@/components/profile/profile-form";

export default function EditProfilePage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="font-heading text-xl font-semibold tracking-tight">Edit profile</h1>
        <p className="text-sm text-muted-foreground">Your public profile updates immediately after you save.</p>
      </div>

      <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
        <ProfileForm key={`${user.userId}-${user.updatedAt}`} user={user} />
      </div>
    </div>
  );
}
