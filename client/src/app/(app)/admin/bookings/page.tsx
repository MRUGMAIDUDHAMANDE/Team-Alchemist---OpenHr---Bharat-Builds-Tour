"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { adminApi, type AdminBooking } from "@/lib/admin/api";
import { BookingStatusBadge } from "@/components/marketplace/status-badges";
import { FormAlert } from "@/components/form/form-alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BookingStatus } from "@/lib/marketplace/types";

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    adminApi
      .bookings()
      .then(({ bookings: list }) => {
        if (!active) return;
        setBookings(list);
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
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((skeleton) => (
          <Skeleton key={skeleton} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? <FormAlert>{error}</FormAlert> : null}
      <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Booking</TableHead>
              <TableHead>Publisher</TableHead>
              <TableHead>Seeker</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((booking) => (
              <TableRow key={booking.bookingId}>
                <TableCell className="font-mono text-xs">{booking.bookingId.slice(0, 13)}…</TableCell>
                <TableCell>{booking.publisherName}</TableCell>
                <TableCell>{booking.seekerName}</TableCell>
                <TableCell>₹{booking.totalAmount.toLocaleString("en-IN")}</TableCell>
                <TableCell>
                  <BookingStatusBadge status={booking.status as BookingStatus} />
                </TableCell>
                <TableCell className="text-muted-foreground">{booking.createdAt.slice(0, 10)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
