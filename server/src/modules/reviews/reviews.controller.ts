import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { AppError } from "../../lib/errors";
import { bookingsRepository } from "../bookings/bookings.repository";
import { emitNotification } from "../notifications/events";
import { usersRepository } from "../users/users.repository";
import { reviewsRepository } from "./reviews.repository";
import type { CreateReviewInput, ListReviewsQuery } from "./reviews.schemas";
import { reviewsService } from "./reviews.service";

function authenticatedUserId(req: Request): string {
  const userId = req.auth?.userId;
  if (!userId) {
    throw AppError.unauthorized();
  }
  return userId;
}

export const reviewsController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const review = await reviewsService.createReview(
      authenticatedUserId(req),
      req.body as CreateReviewInput,
      reviewsRepository,
      bookingsRepository,
      usersRepository,
    );
    await emitNotification({
      userId: review.revieweeId,
      type: "REVIEW_CREATED",
      title: "New review",
      body: `${review.reviewerName} left you a ${review.rating}-star review.`,
      link: `/u/${review.revieweeId}`,
    });
    res.status(201).json({ data: { review } });
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const page = await reviewsService.listReviews(req.query as unknown as ListReviewsQuery, reviewsRepository);
    res.status(200).json({ data: page });
  }),
};
