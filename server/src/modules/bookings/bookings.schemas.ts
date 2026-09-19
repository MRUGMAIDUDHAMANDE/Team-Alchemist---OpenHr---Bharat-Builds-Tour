import { z } from "zod";

export const bookingIdParamsSchema = z
  .object({
    bookingId: z.string().trim().min(1, "Booking ID is required").max(128, "Booking ID is too long"),
  })
  .strict();

export const listBookingsQuerySchema = z
  .object({
    role: z.enum(["seeker", "publisher"]),
    limit: z.coerce.number().int("Limit must be a whole number").min(1, "Limit must be at least 1").max(50, "Limit must be at most 50").default(20),
    cursor: z.string().trim().min(1, "Cursor must not be blank").max(4096, "Cursor is too long").optional(),
  })
  .strict();

export type BookingIdParams = z.infer<typeof bookingIdParamsSchema>;
export type ListBookingsQuery = z.infer<typeof listBookingsQuerySchema>;
