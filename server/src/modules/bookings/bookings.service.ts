import { AppError } from "../../lib/errors";
import { decodePageCursor, encodePageCursor } from "../availability/availability.pagination";
import type { bookingsRepository } from "./bookings.repository";
import type { ListBookingsQuery } from "./bookings.schemas";
import type { Booking } from "./bookings.types";

export type BookingStore = Pick<typeof bookingsRepository, "getById" | "listByPublisher" | "listBySeeker" | "transitionBooking">;

function requireParticipant(booking: Booking | null, userId: string): Booking {
  if (!booking || (booking.publisherId !== userId && booking.seekerId !== userId)) {
    throw AppError.notFound("Booking not found");
  }
  return booking;
}

function isConditionalCheckFailed(error: unknown): boolean {
  return error instanceof Error && error.name === "ConditionalCheckFailedException";
}

export interface BookingPage {
  items: Booking[];
  nextCursor: string | null;
}

export const bookingsService = {
  async getBooking(userId: string, bookingId: string, store: BookingStore): Promise<Booking> {
    return requireParticipant(await store.getById(bookingId), userId);
  },

  async startBooking(userId: string, bookingId: string, store: BookingStore): Promise<Booking> {
    const booking = requireParticipant(await store.getById(bookingId), userId);
    if (booking.publisherId !== userId) {
      throw AppError.forbidden("Only the publisher can start the service.");
    }
    if (booking.status !== "CONFIRMED") {
      throw AppError.conflict(`Only confirmed bookings can start. This booking is ${booking.status.toLowerCase()}.`);
    }
    try {
      return await store.transitionBooking(bookingId, ["CONFIRMED"], "IN_PROGRESS");
    } catch (error) {
      if (isConditionalCheckFailed(error)) {
        throw AppError.conflict("This booking changed while you acted. Refresh and try again.");
      }
      throw error;
    }
  },

  async completeBooking(userId: string, bookingId: string, store: BookingStore): Promise<Booking> {
    const booking = requireParticipant(await store.getById(bookingId), userId);
    if (booking.status !== "IN_PROGRESS") {
      throw AppError.conflict(`Only bookings in progress can complete. This booking is ${booking.status.toLowerCase()}.`);
    }
    try {
      return await store.transitionBooking(bookingId, ["IN_PROGRESS"], "COMPLETED");
    } catch (error) {
      if (isConditionalCheckFailed(error)) {
        throw AppError.conflict("This booking changed while you acted. Refresh and try again.");
      }
      throw error;
    }
  },

  async cancelBooking(userId: string, bookingId: string, reason: string | undefined, store: BookingStore): Promise<Booking> {
    const normalizedReason = reason?.trim() ? reason.trim() : undefined;
    const booking = requireParticipant(await store.getById(bookingId), userId);
    if (booking.status !== "CONFIRMED" && booking.status !== "IN_PROGRESS") {
      throw AppError.conflict(`This booking is already ${booking.status.toLowerCase()}.`);
    }
    try {
      return await store.transitionBooking(bookingId, ["CONFIRMED", "IN_PROGRESS"], "CANCELLED", normalizedReason ? { cancelReason: normalizedReason } : undefined);
    } catch (error) {
      if (isConditionalCheckFailed(error)) {
        throw AppError.conflict("This booking changed while you acted. Refresh and try again.");
      }
      throw error;
    }
  },

  async listMine(userId: string, query: ListBookingsQuery, store: BookingStore): Promise<BookingPage> {
    const result =
      query.role === "seeker"
        ? await store.listBySeeker(userId, query.limit, decodePageCursor(query.cursor))
        : await store.listByPublisher(userId, query.limit, decodePageCursor(query.cursor));
    return { items: result.items, nextCursor: encodePageCursor(result.lastKey) };
  },
};
