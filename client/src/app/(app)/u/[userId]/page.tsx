import { Suspense } from "react";
import type { Metadata } from "next";
import { PublicProfile } from "@/components/profile/public-profile";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Publisher profile" };

export default function PublicProfilePage(props: PageProps<"/u/[userId]">) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-5xl space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-72 w-full" />
        </div>
      }
    >
      <PublicProfile params={props.params} />
    </Suspense>
  );
}
