"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { availabilityApi } from "@/lib/availability/api";
import { formatSlotWindow } from "@/lib/availability/format";
import type { AvailabilitySlot, AvailabilityStatus } from "@/lib/availability/types";
import { AvailabilityCard } from "@/components/availability-card";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/form/form-alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type StatusFilter = "ALL" | AvailabilityStatus;

const filters: Array<{ value: StatusFilter; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "AVAILABLE", label: "Available" },
  { value: "BOOKED", label: "Booked" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function AvailabilityPage() {
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [items, setItems] = useState<AvailabilitySlot[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingCancel, setPendingCancel] = useState<AvailabilitySlot | null>(null);

  useEffect(() => {
    let active = true;

    availabilityApi
      .listMine(filter === "ALL" ? { limit: 20 } : { status: filter, limit: 20 })
      .then((page) => {
        if (!active) return;
        setItems(page.items);
        setCursor(page.nextCursor);
        setLoading(false);
      })
      .catch((fetchError) => {
        if (!active) return;
        setError(fetchError instanceof ApiError ? fetchError.message : "Availability could not be loaded. Try again.");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filter]);

  const handleFilterChange = (next: StatusFilter) => {
    if (next === filter) return;
    setError(null);
    setItems([]);
    setCursor(null);
    setLoading(true);
    setFilter(next);
  };

  const handleLoadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);

    try {
      const page = await availabilityApi.listMine(
        filter === "ALL" ? { limit: 20, cursor } : { status: filter, limit: 20, cursor },
      );
      setItems((current) => [...current, ...page.items]);
      setCursor(page.nextCursor);
    } catch (fetchError) {
      setError(fetchError instanceof ApiError ? fetchError.message : "More availability could not be loaded. Try again.");
    } finally {
      setLoadingMore(false);
    }
  };

  const handleCancel = async () => {
    if (!pendingCancel) return;
    setError(null);

    try {
      const { availability } = await availabilityApi.cancelMine(pendingCancel.availabilityId);
      setItems((current) => current.map((item) => (item.availabilityId === availability.availabilityId ? availability : item)));
      setPendingCancel(null);
      toast.success("Availability cancelled");
    } catch (cancelError) {
      setError(cancelError instanceof ApiError ? cancelError.message : "Availability could not be cancelled. Try again.");
      setPendingCancel(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-heading text-xl font-semibold tracking-tight">My availability</h1>
          <p className="text-sm text-muted-foreground">Publish the hours when seekers can request you.</p>
        </div>
        <Button size="sm" asChild>
          <Link href="/availability/new">Publish availability</Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <Button
            key={item.value}
            size="sm"
            variant={filter === item.value ? "secondary" : "ghost"}
            onClick={() => handleFilterChange(item.value)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {error ? <FormAlert>{error}</FormAlert> : null}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((skeleton) => (
            <Skeleton key={skeleton} className="h-64 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="space-y-3 rounded-xl bg-card p-6 ring-1 ring-foreground/10">
          <h2 className="font-heading text-base font-semibold">No availability in this view</h2>
          <p className="text-sm text-muted-foreground">Publish your first slot to become findable by seekers.</p>
          <Button size="sm" asChild>
            <Link href="/availability/new">Publish availability</Link>
          </Button>
        </div>
      ) : (
        <div className="grid items-start gap-4 sm:grid-cols-2">
          {items.map((slot) => (
            <AvailabilityCard
              key={slot.availabilityId}
              name={slot.publisherName}
              headline={slot.skills[0] ?? "Availability"}
              location={slot.location}
              mode={slot.mode}
              hourlyRate={slot.hourlyRate}
              window={formatSlotWindow(slot.startTime, slot.endTime)}
              skills={slot.skills}
              status={slot.status}
              footer={
                slot.status === "AVAILABLE" ? (
                  <>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/availability/${slot.availabilityId}/edit`}>Edit</Link>
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setPendingCancel(slot)}>
                      Cancel slot
                    </Button>
                  </>
                ) : null
              }
            />
          ))}
        </div>
      )}

      {cursor && !loading ? (
        <div className="flex justify-center">
          <Button variant="outline" onClick={handleLoadMore} disabled={loadingMore}>
            {loadingMore ? "Loading more" : "Load more"}
          </Button>
        </div>
      ) : null}

      <AlertDialog
        open={pendingCancel !== null}
        onOpenChange={(open) => {
          if (!open) setPendingCancel(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this availability?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingCancel ? formatSlotWindow(pendingCancel.startTime, pendingCancel.endTime) : ""} will no longer
              be requestable. Cancelled slots stay in your history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep slot</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleCancel}>
              Cancel availability
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
