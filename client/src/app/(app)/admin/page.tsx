"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { adminApi, type AdminOverview } from "@/lib/admin/api";
import { FormAlert } from "@/components/form/form-alert";
import { Skeleton } from "@/components/ui/skeleton";

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

export default function AdminOverviewPage() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    adminApi
      .overview()
      .then(setOverview)
      .catch((fetchError) => {
        if (active) {
          setError(fetchError instanceof ApiError ? fetchError.message : "Overview could not be loaded. Try again.");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (error) return <FormAlert>{error}</FormAlert>;

  if (!overview) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((skeleton) => (
          <Skeleton key={skeleton} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Kpi label="Total users" value={overview.users.total} />
      <Kpi label="Active users" value={overview.users.active} />
      <Kpi label="Suspended users" value={overview.users.suspended} />
      <Kpi label="Available slots" value={overview.availability.available} />
      <Kpi label="Booked slots" value={overview.availability.booked} />
      <Kpi label="Completed bookings" value={overview.bookings.completed} />
      <Kpi label="Platform revenue" value={`₹${overview.platformRevenue.toLocaleString("en-IN")}`} />
      <Kpi label="New contact messages" value={overview.contactNew} />
    </div>
  );
}
