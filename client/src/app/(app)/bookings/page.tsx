"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { feeBreakdown, publicSettingsApi } from "@/lib/admin/api";
import { useAuth } from "@/lib/auth/auth-context";
import { bookingsApi, reviewsApi } from "@/lib/marketplace/api";
import type { Booking } from "@/lib/marketplace/types";
import { formatSlotWindow } from "@/lib/availability/format";
import { BookingStatusBadge } from "@/components/marketplace/status-badges";
import { CancelBookingDialog } from "@/components/marketplace/cancel-booking-dialog";
import { ReviewDialog } from "@/components/marketplace/review-dialog";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/form/form-alert";
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
  const [actingId, setActingId] = useState<string | null>(null);
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [cancelBooking, setCancelBooking] = useState<Booking | null>(null);
  const [commission, setCommission] = useState<{ buyer: number; seller: number } | null>(null);

  useEffect(() => {
    let active = true;

    publicSettingsApi
      .commission()
      .then(({ settings }) => {
        if (active) setCommission({ buyer: settings.buyerCommissionPercent, seller: settings.sellerCommissionPercent });
      })
      .catch(() => {
        // Fee lines stay hidden when settings cannot load.
      });

    return () => {
      active = false;
    };
  }, []);

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

  const refresh = async () => {
    try {
      const page = await bookingsApi.listMine(role);
      setItems(page.items);
      setCursor(page.nextCursor);
    } catch (fetchError) {
      setError(fetchError instanceof ApiError ? fetchError.message : "Bookings could not be loaded. Try again.");
    }
  };

  const act = async (bookingId: string, action: "start" | "complete", successMessage: string) => {
    setActingId(bookingId);
    setError(null);

    try {
      if (action === "start") await bookingsApi.start(bookingId);
      if (action === "complete") await bookingsApi.complete(bookingId);
      toast.success(successMessage);
      await refresh();
    } catch (actionError) {
      setError(actionError instanceof ApiError ? actionError.message : "Action could not be completed. Try again.");
    } finally {
      setActingId(null);
    }
  };

  const handleCancelConfirm = async (reason?: string) => {
    if (!cancelBooking) return;
    setActingId(cancelBooking.bookingId);
    setError(null);

    try {
      await bookingsApi.cancel(cancelBooking.bookingId, reason);
      toast.success("Booking cancelled");
      await refresh();
    } catch (actionError) {
      setError(actionError instanceof ApiError ? actionError.message : "Booking could not be cancelled. Try again.");
    } finally {
      setActingId(null);
      setCancelBooking(null);
    }
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
            <BookingRow
              key={booking.bookingId}
              booking={booking}
              role={role}
              commission={commission}
              acting={actingId === booking.bookingId}
              onStart={() => act(booking.bookingId, "start", "Service started")}
              onComplete={() => act(booking.bookingId, "complete", "Booking completed")}
              onCancel={() => setCancelBooking(booking)}
              onReview={() => setReviewBooking(booking)}
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

      <ReviewDialog booking={reviewBooking} onClose={() => setReviewBooking(null)} onReviewed={refresh} />
      <CancelBookingDialog booking={cancelBooking} onClose={() => setCancelBooking(null)} onConfirm={handleCancelConfirm} />
    </div>
  );
}

function BookingRow({
  booking,
  role,
  commission,
  acting,
  onStart,
  onComplete,
  onCancel,
  onReview,
}: {
  booking: Booking;
  role: Role;
  commission: { buyer: number; seller: number } | null;
  acting: boolean;
  onStart: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onReview: () => void;
}) {
  const fees = commission
    ? feeBreakdown(booking.totalAmount, commission.buyer, commission.seller)
    : null;

  return (
    <li className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
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
      <div className="mt-3 space-y-1 border-t pt-3 text-sm">
        <div className="flex items-baseline justify-between">
          <span className="text-muted-foreground">
            ₹{booking.hourlyRate.toLocaleString("en-IN")}/hour
          </span>
          <span className="font-semibold">Total ₹{booking.totalAmount.toLocaleString("en-IN")}</span>
        </div>
        {fees ? (
          <p className="text-xs text-muted-foreground">
            {role === "publisher"
              ? `You receive ₹${fees.sellerPayout.toLocaleString("en-IN")} after a ₹${fees.sellerFee.toLocaleString("en-IN")} platform fee.`
              : `You pay ₹${fees.buyerTotal.toLocaleString("en-IN")}, including a ₹${fees.buyerFee.toLocaleString("en-IN")} platform fee.`}
          </p>
        ) : null}
      </div>

      {booking.status === "CONFIRMED" && role === "publisher" ? (
        <div className="flex flex-wrap gap-2 pt-3">
          <Button size="sm" onClick={onStart} disabled={acting}>
            Start service
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel} disabled={acting}>
            Cancel booking
          </Button>
        </div>
      ) : null}

      {booking.status === "CONFIRMED" && role === "seeker" ? (
        <div className="flex flex-wrap gap-2 pt-3">
          <Button size="sm" variant="outline" onClick={onCancel} disabled={acting}>
            Cancel booking
          </Button>
        </div>
      ) : null}

      {booking.status === "IN_PROGRESS" ? (
        <div className="flex flex-wrap gap-2 pt-3">
          <Button size="sm" onClick={onComplete} disabled={acting}>
            Mark complete
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel} disabled={acting}>
            Cancel booking
          </Button>
        </div>
      ) : null}

      {booking.status === "COMPLETED" ? (
        <div className="flex flex-wrap gap-2 pt-3">
          <ReviewAction booking={booking} onReview={onReview} />
        </div>
      ) : null}
    </li>
  );
}

function ReviewAction({ booking, onReview }: { booking: Booking; onReview: () => void }) {
  const { user } = useAuth();
  const [checked, setChecked] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);

  useEffect(() => {
    let active = true;

    reviewsApi
      .listByBooking(booking.bookingId)
      .then(({ items }) => {
        if (!active) return;
        setAlreadyReviewed(items.some((review) => review.reviewerId === user?.userId));
        setChecked(true);
      })
      .catch(() => {
        if (active) setChecked(true);
      });

    return () => {
      active = false;
    };
  }, [booking.bookingId, user?.userId]);

  if (!checked || alreadyReviewed) return null;

  return (
    <Button size="sm" variant="outline" onClick={onReview}>
      Leave a review
    </Button>
  );
}
