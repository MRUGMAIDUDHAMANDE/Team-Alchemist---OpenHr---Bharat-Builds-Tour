"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { availabilityApi } from "@/lib/availability/api";
import { availabilityInitialValues } from "@/lib/availability/form";
import type { AvailabilitySlot } from "@/lib/availability/types";
import { AvailabilityForm } from "@/components/availability/availability-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type LoadState = "loading" | "ready" | "missing" | "error" | "locked";

export default function EditAvailabilityPage() {
  const params = useParams<{ availabilityId: string }>();
  const availabilityId = params.availabilityId;
  const router = useRouter();
  const [slot, setSlot] = useState<AvailabilitySlot | null>(null);
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    let active = true;

    availabilityApi
      .getMine(availabilityId)
      .then(({ availability }) => {
        if (!active) return;
        setSlot(availability);
        setState(availability.status === "AVAILABLE" ? "ready" : "locked");
      })
      .catch((error) => {
        if (!active) return;
        setState(error instanceof ApiError && error.status === 404 ? "missing" : "error");
      });

    return () => {
      active = false;
    };
  }, [availabilityId]);

  if (state === "loading") {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!slot || state === "missing" || state === "error") {
    return (
      <div className="mx-auto w-full max-w-xl space-y-4 rounded-xl bg-card p-6 text-center ring-1 ring-foreground/10">
        <h1 className="font-heading text-lg font-semibold">Availability unavailable</h1>
        <p className="text-sm text-muted-foreground">
          {state === "missing"
            ? "This slot does not exist or belongs to another account."
            : "This slot could not be loaded. Try again."}
        </p>
        <Button size="sm" asChild>
          <Link href="/availability">Back to availability</Link>
        </Button>
      </div>
    );
  }

  if (state === "locked") {
    return (
      <div className="mx-auto w-full max-w-xl space-y-4 rounded-xl bg-card p-6 text-center ring-1 ring-foreground/10">
        <h1 className="font-heading text-lg font-semibold">This slot can no longer change</h1>
        <p className="text-sm text-muted-foreground">
          Only slots with available status can be edited. This slot is {slot.status.toLowerCase()}.
        </p>
        <Button size="sm" asChild>
          <Link href="/availability">Back to availability</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="font-heading text-xl font-semibold tracking-tight">Edit availability</h1>
        <p className="text-sm text-muted-foreground">Changes apply immediately to this available slot.</p>
      </div>

      <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
        <AvailabilityForm
          key={`${slot.availabilityId}-${slot.updatedAt}`}
          initial={availabilityInitialValues(slot)}
          submitLabel="Save changes"
          cancelHref="/availability"
          errorMessage="Changes could not be saved. Try again."
          onSubmit={async (input) => {
            await availabilityApi.updateMine(slot.availabilityId, input);
            toast.success("Changes saved");
            router.push("/availability");
          }}
          onSuccess={() => {}}
        />
      </div>
    </div>
  );
}
