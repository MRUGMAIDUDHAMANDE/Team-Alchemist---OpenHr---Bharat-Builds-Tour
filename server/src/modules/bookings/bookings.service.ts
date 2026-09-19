import { AppError } from "../../lib/errors";
import { decodePageCursor, encodePageCursor } from "../availability/availability.pagination";
import type { bookingsRepository } from "./bookings.repository";
import type { ListBookingsQuery } from "./bookings.schemas";
import type { Booking } from "./bookings.types";

export type BookingStore = Pick<typeof bookingsRepository, "getById" | "listByPublisher" | "listBySeeker">;

export interface BookingPage {
  items: Booking[];
  nextCursor: string | null;
}

export const bookingsService = {
  async getBooking(userId: string, bookingId: string, store: BookingStore): Promise<Booking> {
    const booking = await store.getById(bookingId);
    if (!booking || (booking.publisherId !== userId && booking.seekerId !== userId)) {
      throw AppError.notFound("Booking not found");
    }
    return booking;
  },

  async listMine(userId: string, query: ListBookingsQuery, store: BookingStore): Promise<BookingPage> {
    const result =
      query.role === "seeker"
        ? await store.listBySeeker(userId, query.limit, decodePageCursor(query.cursor))
        : await store.listByPublisher(userId, query.limit, decodePageCursor(query.cursor));
    return { items: result.items, nextCursor: encodePageCursor(result.lastKey) };
  },
};
