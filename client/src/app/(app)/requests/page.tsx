"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { requestsApi } from "@/lib/marketplace/api";
import type { BookingRequest, RequestStatus } from "@/lib/marketplace/types";
import { formatSlotWindow } from "@/lib/availability/format";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/form/form-alert";
import { RequestStatusBadge } from "@/components/marketplace/status-badges";
import { Skeleton } from "@/components/ui/skeleton";

type Role = "publisher" | "seeker";

const roleTabs: Array<{ value: Role; label: string }> = [
  { value: "publisher", label: "Received" },
  { value: "seeker", label: "Sent" },
];

export default function RequestsPage() {
  const [role, setRole] = useState<Role>("publisher");
  const [items, setItems] = useState<BookingRequest[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    requestsApi
      .listMine(role)
      .then((page) => {
        if (!active) return;
        setItems(page.items);
        setCursor(page.nextCursor);
        setLoading(false);
      })
      .catch((fetchError) => {
        if (!active) return;
        setError(fetchError instanceof ApiError ? fetchError.message : "Requests could not be loaded. Try again.");
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

  const refresh = async () => {
    try {
      const page = await requestsApi.listMine(role);
      setItems(page.items);
      setCursor(page.nextCursor);
    } catch (fetchError) {
      setError(fetchError instanceof ApiError ? fetchError.message : "Requests could not be loaded. Try again.");
    }
  };

  const act = async (requestId: string, action: "accept" | "reject" | "cancel", successMessage: string) => {
    setActingId(requestId);
    setError(null);

    try {
      if (action === "accept") await requestsApi.accept(requestId);
      if (action === "reject") await requestsApi.reject(requestId);
      if (action === "cancel") await requestsApi.cancel(requestId);
      toast.success(successMessage);
      await refresh();
    } catch (actionError) {
      setError(actionError instanceof ApiError ? actionError.message : "Action could not be completed. Try again.");
    } finally {
      setActingId(null);
    }
  };

  const handleLoadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);

    try {
      const page = await requestsApi.listMine(role, undefined, cursor);
      setItems((current) => [...current, ...page.items]);
      setCursor(page.nextCursor);
    } catch (fetchError) {
      setError(fetchError instanceof ApiError ? fetchError.message : "More requests could not be loaded. Try again.");
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="space-y-1">
        <h1 className="font-heading text-xl font-semibold tracking-tight">Requests</h1>
        <p className="text-sm text-muted-foreground">
          {role === "publisher" ? "Requests seekers sent for your availability." : "Requests you sent to publishers."}
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
            <Skeleton key={skeleton} className="h-36 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="space-y-3 rounded-xl bg-card p-6 ring-1 ring-foreground/10">
          <h2 className="font-heading text-base font-semibold">
            {role === "publisher" ? "No requests received yet" : "No requests sent yet"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {role === "publisher"
              ? "When a seeker requests one of your slots, it appears here for accept or reject."
              : "Find an available slot on Explore and send your first request."}
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {items.map((request) => (
            <RequestRow
              key={request.requestId}
              request={request}
              role={role}
              acting={actingId === request.requestId}
              onAccept={() => act(request.requestId, "accept", "Booking confirmed")}
              onReject={() => act(request.requestId, "reject", "Request rejected")}
              onCancel={() => act(request.requestId, "cancel", "Request cancelled")}
            />
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

function RequestRow({
  request,
  role,
  acting,
  onAccept,
  onReject,
  onCancel,
}: {
  request: BookingRequest;
  role: Role;
  acting: boolean;
  onAccept: () => void;
  onReject: () => void;
  onCancel: () => void;
}) {
  const pending = request.status === "PENDING";

  return (
    <li className="space-y-3 rounded-xl bg-card p-5 ring-1 ring-foreground/10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {request.skills[0] ?? "Availability"} · ₹{request.hourlyRate.toLocaleString("en-IN")}/hour
          </p>
          <p className="text-xs text-muted-foreground">
            {formatSlotWindow(request.startTime, request.endTime)} · {request.location} ·{" "}
            {role === "publisher" ? `from ${request.seekerName}` : "awaiting publisher response"}
          </p>
        </div>
        <RequestStatusBadge status={request.status satisfies RequestStatus} />
      </div>

      <p className="text-sm text-muted-foreground">{request.message}</p>

      {pending && role === "publisher" ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={onAccept} disabled={acting}>
            Accept and book
          </Button>
          <Button size="sm" variant="outline" onClick={onReject} disabled={acting}>
            Reject
          </Button>
        </div>
      ) : null}

      {pending && role === "seeker" ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={onCancel} disabled={acting}>
            Cancel request
          </Button>
        </div>
      ) : null}
    </li>
  );
}
