"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { bookingsApi } from "@/lib/marketplace/api";
import type { Booking } from "@/lib/marketplace/types";
import { formatSlotWindow } from "@/lib/availability/format";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/form/form-alert";
import { BookingStatusBadge } from "@/components/marketplace/status-badges";
import { Skeleton } from "@/components/ui/skeleton";

type Role = "publisher" | "seeker";

const roleTabs: Array<{ value: Role; label: string }> = [
  { value: "publisher", label: "Earned" },
  { value: "seeker", label: "Booked" },
];

export default function BookingsPage() {
  const [role, setRole] = useState<Role>("seeker");
  const [items, setItems] = useState<Booking[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    bookingsApi
      .listMine(role)
      .then((page) => {
        if (!active) return;
        setItems(page.items);
        setCursor(page.nextCursor);
        setLoading(false);
      })
      .catch((fetchError) => {
        if (!active) return;
        setError(fetchError instanceof ApiError ? fetchError.message : "Bookings could not be loaded. Try again.");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [role]);

  const handleRoleChange = (next: Role) => {
    if (next === role) return;
    setError(null);
    setItems([]);
    setCursor(null);
    setLoading(true);
    setRole(next);
  };

  const handleLoadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);

    try {
      const page = await bookingsApi.listMine(role, cursor);
      setItems((current) => [...current, ...page.items]);
      setCursor(page.nextCursor);
    } catch (fetchError) {
      setError(fetchError instanceof ApiError ? fetchError.message : "More bookings could not be loaded. Try again.");
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="space-y-1">
        <h1 className="font-heading text-xl font-semibold tracking-tight">Bookings</h1>
        <p className="text-sm text-muted-foreground">
          {role === "publisher" ? "Slots seekers booked with you." : "Slots you booked with publishers."}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {roleTabs.map((tab) => (
          <Button
            key={tab.value}
            size="sm"
            variant={role === tab.value ? "secondary" : "ghost"}
            onClick={() => handleRoleChange(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {error ? <FormAlert>{error}</FormAlert> : null}

      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((skeleton) => (
            <Skeleton key={skeleton} className="h-32 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="space-y-3 rounded-xl bg-card p-6 ring-1 ring-foreground/10">
          <h2 className="font-heading text-base font-semibold">No bookings yet</h2>
          <p className="text-sm text-muted-foreground">
            {role === "publisher"
              ? "Accepted requests become confirmed bookings here."
              : "When a publisher accepts your request, the confirmed booking appears here."}
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {items.map((booking) => (
            <li key={booking.bookingId} className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">
                    {role === "publisher" ? booking.seekerName : booking.publisherName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatSlotWindow(booking.startTime, booking.endTime)}
                  </p>
                </div>
                <BookingStatusBadge status={booking.status} />
              </div>
              <div className="mt-3 flex items-baseline justify-between border-t pt-3 text-sm">
                <span className="text-muted-foreground">
                  ₹{booking.hourlyRate.toLocaleString("en-IN")}/hour
                </span>
                <span className="font-semibold">Total ₹{booking.totalAmount.toLocaleString("en-IN")}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {cursor && !loading ? (
        <div className="flex justify-center">
          <Button variant="outline" onClick={handleLoadMore} disabled={loadingMore}>
            {loadingMore ? "Loading more" : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
