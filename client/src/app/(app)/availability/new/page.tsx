"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/auth-context";
import { availabilityApi } from "@/lib/availability/api";
import { availabilityInitialValues } from "@/lib/availability/form";
import { AvailabilityForm } from "@/components/availability/availability-form";

export default function NewAvailabilityPage() {
  const router = useRouter();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="font-heading text-xl font-semibold tracking-tight">Publish availability</h1>
        <p className="text-sm text-muted-foreground">Seekers can request an available slot in the next milestone.</p>
      </div>

      <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
        <AvailabilityForm
          initial={availabilityInitialValues(undefined, user.preferredMode)}
          submitLabel="Publish availability"
          cancelHref="/availability"
          errorMessage="Availability could not be published. Try again."
          onSubmit={async (input) => {
            await availabilityApi.create(input);
            toast.success("Availability published");
            router.push("/availability");
          }}
          onSuccess={() => {}}
        />
      </div>
    </div>
  );
}
