import { AppError } from "../../lib/errors";
import { decodePageCursor, encodePageCursor } from "../availability/availability.pagination";
import type { bookingsRepository } from "../bookings/bookings.repository";
import type { usersRepository } from "../users/users.repository";
import type { reviewsRepository } from "./reviews.repository";
import type { CreateReviewInput, ListReviewsQuery } from "./reviews.schemas";
import type { Review } from "./reviews.types";

export type ReviewStore = Pick<typeof reviewsRepository, "getById" | "listByReviewee" | "listByBooking" | "createWithRating">;
export type ReviewedBookingStore = Pick<typeof bookingsRepository, "getById">;
export type RevieweeDirectory = Pick<typeof usersRepository, "getById">;

export interface ReviewPage {
  items: Review[];
  nextCursor: string | null;
}

const MAX_RATING_ATTEMPTS = 3;

function isTransactionCanceled(error: unknown): boolean {
  return error instanceof Error && error.name === "TransactionCanceledException";
}

function putFailed(reasons: unknown): boolean {
  if (!Array.isArray(reasons)) return false;
  const first = reasons[0] as { Code?: string } | undefined;
  return !!first?.Code && first.Code !== "None";
}

export const reviewsService = {
  async createReview(
    reviewerId: string,
    input: CreateReviewInput,
    reviewStore: ReviewStore,
    bookingStore: ReviewedBookingStore,
    userStore: RevieweeDirectory,
  ): Promise<Review> {
    const booking = await bookingStore.getById(input.bookingId);
    if (!booking || (booking.publisherId !== reviewerId && booking.seekerId !== reviewerId)) {
      throw AppError.notFound("Booking not found");
    }
    if (booking.status !== "COMPLETED") {
      throw AppError.conflict("Reviews are only allowed on completed bookings.");
    }

    const revieweeId = reviewerId === booking.publisherId ? booking.seekerId : booking.publisherId;
    const reviewId = `rv_${booking.requestId}_${reviewerId}`;
    const existing = await reviewStore.getById(reviewId);
    if (existing) {
      throw AppError.conflict("You already reviewed this booking.");
    }

    const reviewer = await userStore.getById(reviewerId);
    if (!reviewer) {
      throw AppError.notFound("Profile not found");
    }

    const timestamp = new Date().toISOString();
    const review: Review = {
      reviewId,
      bookingId: booking.bookingId,
      reviewerId,
      reviewerName: reviewer.name,
      revieweeId,
      rating: input.rating,
      text: input.text,
      createdAt: timestamp,
    };

    for (let attempt = 0; attempt < MAX_RATING_ATTEMPTS; attempt += 1) {
      const reviewee = await userStore.getById(revieweeId);
      if (!reviewee) {
        throw AppError.notFound("Profile not found");
      }
      const sum = (reviewee.ratingSum ?? reviewee.ratingAverage * reviewee.ratingCount) + input.rating;
      const count = reviewee.ratingCount + 1;

      try {
        await reviewStore.createWithRating(review, {
          revieweeId,
          expectedCount: reviewee.ratingCount,
          newAverage: Math.round((sum / count) * 10) / 10,
          newCount: count,
          newSum: sum,
          timestamp,
        });
        return review;
      } catch (error) {
        if (!isTransactionCanceled(error)) throw error;
        const reasons = (error as { CancellationReasons?: unknown }).CancellationReasons;
        if (putFailed(reasons)) {
          throw AppError.conflict("You already reviewed this booking.");
        }
      }
    }

    throw AppError.conflict("Conflicting update. Try again.");
  },

  async listReviews(query: ListReviewsQuery, store: ReviewStore): Promise<ReviewPage> {
    if (query.bookingId) {
      const items = await store.listByBooking(query.bookingId);
      return { items, nextCursor: null };
    }
    if (!query.revieweeId) {
      throw AppError.badRequest("Filter by revieweeId or bookingId.");
    }
    const result = await store.listByReviewee(query.revieweeId, query.limit, decodePageCursor(query.cursor));
    return { items: result.items, nextCursor: encodePageCursor(result.lastKey) };
  },
};
