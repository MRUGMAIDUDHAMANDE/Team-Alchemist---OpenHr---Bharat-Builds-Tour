import { z } from "zod";

export const createReviewSchema = z
  .object({
    bookingId: z.string().trim().min(1, "Booking ID is required").max(128, "Booking ID is too long"),
    rating: z.number().int("Rating must be a whole number").min(1, "Rating must be at least 1").max(5, "Rating must be at most 5"),
    text: z.string().trim().min(1, "Write a few words about the experience.").max(1000, "Review must be at most 1000 characters"),
  })
  .strict();

export const listReviewsQuerySchema = z
  .object({
    revieweeId: z.string().trim().min(1, "Reviewee ID is required").max(128, "Reviewee ID is too long").optional(),
    bookingId: z.string().trim().min(1, "Booking ID is required").max(128, "Booking ID is too long").optional(),
    limit: z.coerce.number().int("Limit must be a whole number").min(1, "Limit must be at least 1").max(50, "Limit must be at most 50").default(20),
    cursor: z.string().trim().min(1, "Cursor must not be blank").max(4096, "Cursor is too long").optional(),
  })
  .strict()
  .refine((value) => value.revieweeId || value.bookingId, {
    message: "Filter by revieweeId or bookingId.",
  });

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type ListReviewsQuery = z.infer<typeof listReviewsQuerySchema>;
