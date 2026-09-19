"use client";

import { use, useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { usersApi } from "@/lib/users/api";
import { reviewsApi } from "@/lib/marketplace/api";
import type { Review } from "@/lib/marketplace/types";
import type { PublicUserProfile } from "@/lib/users/types";
import Link from "next/link";
import { ProfileCard } from "@/components/profile/profile-card";
import { RatingDisplay } from "@/components/profile/rating-display";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type LoadState = "loading" | "ready" | "missing" | "error";

export function PublicProfile({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);

  return <PublicProfileLoader key={userId} userId={userId} />;
}

function PublicProfileLoader({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    let active = true;

    usersApi
      .getPublicProfile(userId)
      .then(({ user }) => {
        if (!active) return;
        setProfile(user);
        setState("ready");
      })
      .catch((error) => {
        if (!active) return;
        setState(error instanceof ApiError && error.status === 404 ? "missing" : "error");
      });

    return () => {
      active = false;
    };
  }, [userId]);

  if (state === "loading") {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto w-full max-w-xl space-y-4 rounded-xl bg-card p-6 text-center ring-1 ring-foreground/10">
        <h1 className="font-heading text-lg font-semibold">Profile unavailable</h1>
        <p className="text-sm text-muted-foreground">
          {state === "missing"
            ? "This profile is unavailable or has been deactivated."
            : "This profile could not be loaded. Try again."}
        </p>
        <Button size="sm" asChild>
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="space-y-1">
        <h1 className="font-heading text-xl font-semibold tracking-tight">Publisher profile</h1>
        <p className="text-sm text-muted-foreground">Only information meant for seekers is shown here.</p>
      </div>
      <ProfileCard profile={profile} />
      <ProfileReviews userId={profile.userId} />
    </div>
  );
}

function ProfileReviews({ userId }: { userId: string }) {
  const [reviews, setReviews] = useState<Review[] | null>(null);

  useEffect(() => {
    let active = true;

    reviewsApi
      .listByReviewee(userId)
      .then(({ items }) => {
        if (active) setReviews(items);
      })
      .catch(() => {
        if (active) setReviews([]);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  if (reviews === null || reviews.length === 0) return null;

  return (
    <section className="space-y-4 rounded-xl bg-card p-5 ring-1 ring-foreground/10">
      <h2 className="font-heading text-sm font-medium">
        Reviews · {reviews.length}
      </h2>
      <ul className="space-y-4">
        {reviews.map((review) => (
          <li key={review.reviewId} className="space-y-1 border-t pt-3 first:border-t-0 first:pt-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium">{review.reviewerName}</span>
              <span className="text-xs text-muted-foreground">{review.createdAt.slice(0, 10)}</span>
            </div>
            <RatingDisplay value={review.rating} count={1} showCount={false} />
            <p className="text-sm text-muted-foreground">{review.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
