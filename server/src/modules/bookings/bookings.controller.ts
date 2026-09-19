import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { AppError } from "../../lib/errors";
import { emitNotification } from "../notifications/events";
import { bookingsRepository } from "./bookings.repository";
import type { CancelBookingInput, ListBookingsQuery } from "./bookings.schemas";
import { bookingsService } from "./bookings.service";

function authenticatedUserId(req: Request): string {
  const userId = req.auth?.userId;
  if (!userId) {
    throw AppError.unauthorized();
  }
  return userId;
}

export const bookingsController = {
  listMine: asyncHandler(async (req: Request, res: Response) => {
    const page = await bookingsService.listMine(
      authenticatedUserId(req),
      req.query as unknown as ListBookingsQuery,
      bookingsRepository,
    );
    res.status(200).json({ data: page });
  }),

  getOne: asyncHandler(async (req: Request, res: Response) => {
    const params = req.params as { bookingId: string };
    const booking = await bookingsService.getBooking(authenticatedUserId(req), params.bookingId, bookingsRepository);
    res.status(200).json({ data: { booking } });
  }),

  start: asyncHandler(async (req: Request, res: Response) => {
    const params = req.params as { bookingId: string };
    const booking = await bookingsService.startBooking(authenticatedUserId(req), params.bookingId, bookingsRepository);
    res.status(200).json({ data: { booking } });
  }),

  complete: asyncHandler(async (req: Request, res: Response) => {
    const params = req.params as { bookingId: string };
    const booking = await bookingsService.completeBooking(authenticatedUserId(req), params.bookingId, bookingsRepository);
    await emitNotification({
      userId: booking.publisherId,
      type: "BOOKING_COMPLETED",
      title: "Booking completed",
      body: `Your booking with ${booking.seekerName} is complete.`,
      link: "/bookings",
    });
    await emitNotification({
      userId: booking.seekerId,
      type: "BOOKING_COMPLETED",
      title: "Booking completed",
      body: `Your booking with ${booking.publisherName} is complete. Leave a review.`,
      link: "/bookings",
    });
    res.status(200).json({ data: { booking } });
  }),

  cancel: asyncHandler(async (req: Request, res: Response) => {
    const params = req.params as { bookingId: string };
    const actorId = authenticatedUserId(req);
    const input = req.body as CancelBookingInput;
    const booking = await bookingsService.cancelBooking(actorId, params.bookingId, input.reason, bookingsRepository);
    const otherId = actorId === booking.publisherId ? booking.seekerId : booking.publisherId;
    await emitNotification({
      userId: otherId,
      type: "BOOKING_CANCELLED",
      title: "Booking cancelled",
      body: input.reason?.trim() ? `Reason given: ${input.reason.trim()}` : "The other party cancelled the booking.",
      link: "/bookings",
    });
    res.status(200).json({ data: { booking } });
  }),
};
