import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { AppError } from "../../lib/errors";
import { bookingsRepository } from "./bookings.repository";
import type { ListBookingsQuery } from "./bookings.schemas";
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
};
