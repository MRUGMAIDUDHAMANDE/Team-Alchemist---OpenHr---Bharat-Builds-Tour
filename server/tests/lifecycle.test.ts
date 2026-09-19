import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bookingsService, type BookingStore } from "../src/modules/bookings/bookings.service";
import { reviewsService, type ReviewedBookingStore, type ReviewStore, type RevieweeDirectory } from "../src/modules/reviews/reviews.service";
import { createReviewSchema, listReviewsQuerySchema } from "../src/modules/reviews/reviews.schemas";
import { isAppError } from "../src/lib/errors";
import type { Booking } from "../src/modules/bookings/bookings.types";
import type { Review } from "../src/modules/reviews/reviews.types";
import type { UserProfile } from "../src/modules/users/users.types";

const booking: Booking = {
  bookingId: "bk_req-1",
  availabilityId: "slot-1",
  requestId: "req-1",
  publisherId: "publisher-1",
  publisherName: "Rahul Sharma",
  seekerId: "seeker-1",
  seekerName: "Seeker One",
  hourlyRate: 700,
  startTime: "2026-09-20T10:00:00.000Z",
  endTime: "2026-09-20T12:00:00.000Z",
  totalAmount: 1400,
  status: "CONFIRMED",
  createdAt: "2026-09-19T00:00:00.000Z",
  updatedAt: "2026-09-19T00:00:00.000Z",
};

const reviewee = {
  userId: "publisher-1",
  email: "rahul@example.com",
  name: "Rahul Sharma",
  role: "USER",
  status: "ACTIVE",
  bio: null,
  profilePhotoKey: null,
  skills: [],
  experience: null,
  hourlyRate: null,
  location: null,
  serviceRadiusKm: null,
  languages: [],
  preferredMode: "ANY",
  ratingAverage: 4.0,
  ratingCount: 2,
  ratingSum: 8,
  completedBookings: 0,
  verificationStatus: "UNVERIFIED",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
} as UserProfile;

function createBookingStore(current: Booking | null = booking, failTransition?: unknown) {
  const transitions: Array<unknown> = [];
  const store: BookingStore = {
    async getById() {
      return current;
    },
    async listByPublisher() {
      return { items: current ? [current] : [] };
    },
    async listBySeeker() {
      return { items: current ? [current] : [] };
    },
    async transitionBooking(bookingId: string, from: string[], to: string, extra?: { cancelReason?: string }) {
      transitions.push({ bookingId, from, to, extra });
      if (failTransition) throw failTransition;
      assert.ok(current);
      return { ...current, status: to, ...(extra?.cancelReason ? { cancelReason: extra.cancelReason } : {}) } as Booking;
    },
  };
  return { store, transitions };
}

function transactionCanceled(reasons: Array<{ Code?: string }>): Error {
  const error = new Error("Transaction cancelled");
  error.name = "TransactionCanceledException";
  (error as { CancellationReasons?: unknown }).CancellationReasons = reasons;
  return error;
}

function createReviewDeps(options: {
  booking?: Booking | null;
  users?: Record<string, UserProfile | null>;
  existing?: Review | null;
  ratingFailures?: unknown[];
} = {}) {
  const ratingCalls: Array<unknown> = [];
  const failures = [...(options.ratingFailures ?? [])];
  const reviewStore: ReviewStore = {
    async getById() {
      return options.existing ?? null;
    },
    async listByReviewee() {
      return { items: [] };
    },
    async listByBooking() {
      return options.existing ? [options.existing] : [];
    },
    async createWithRating(review: Review, rating: unknown) {
      ratingCalls.push({ review, rating });
      const failure = failures.shift();
      if (failure) throw failure;
    },
  };
  const bookingStore: ReviewedBookingStore = {
    async getById() {
      return options.booking ?? null;
    },
  };
  const userStore: RevieweeDirectory = {
    async getById(userId: string) {
      return options.users?.[userId] ?? null;
    },
  };
  return { reviewStore, bookingStore, userStore, ratingCalls };
}

const completedBooking: Booking = { ...booking, status: "COMPLETED" };

describe("bookingsService.startBooking", () => {
  it("lets the publisher start a confirmed booking", async () => {
    const { store, transitions } = createBookingStore();
    const result = await bookingsService.startBooking("publisher-1", "bk_req-1", store);
    assert.equal(result.status, "IN_PROGRESS");
    assert.deepEqual(transitions, [{ bookingId: "bk_req-1", from: ["CONFIRMED"], to: "IN_PROGRESS", extra: undefined }]);
  });

  it("forbids the seeker from starting", async () => {
    const { store } = createBookingStore();
    await assert.rejects(
      bookingsService.startBooking("seeker-1", "bk_req-1", store),
      (error: unknown) => isAppError(error) && error.status === 403,
    );
  });

  it("rejects starting a completed booking", async () => {
    const { store } = createBookingStore({ ...booking, status: "COMPLETED" });
    await assert.rejects(
      bookingsService.startBooking("publisher-1", "bk_req-1", store),
      (error: unknown) => isAppError(error) && error.status === 409,
    );
  });
});

describe("bookingsService.completeBooking", () => {
  it("lets either participant complete a booking in progress", async () => {
    const { store } = createBookingStore({ ...booking, status: "IN_PROGRESS" });
    const result = await bookingsService.completeBooking("seeker-1", "bk_req-1", store);
    assert.equal(result.status, "COMPLETED");
  });

  it("rejects completing a confirmed booking", async () => {
    const { store } = createBookingStore();
    await assert.rejects(
      bookingsService.completeBooking("publisher-1", "bk_req-1", store),
      (error: unknown) => isAppError(error) && error.status === 409,
    );
  });
});

describe("bookingsService.cancelBooking", () => {
  it("persists the cancel reason", async () => {
    const { store, transitions } = createBookingStore();
    const result = await bookingsService.cancelBooking("seeker-1", "bk_req-1", "Plans changed", store);
    assert.equal(result.status, "CANCELLED");
    assert.equal(result.cancelReason, "Plans changed");
    assert.deepEqual(transitions[0], {
      bookingId: "bk_req-1",
      from: ["CONFIRMED", "IN_PROGRESS"],
      to: "CANCELLED",
      extra: { cancelReason: "Plans changed" },
    });
  });

  it("rejects cancelling a completed booking", async () => {
    const { store } = createBookingStore({ ...booking, status: "COMPLETED" });
    await assert.rejects(
      bookingsService.cancelBooking("seeker-1", "bk_req-1", undefined, store),
      (error: unknown) => isAppError(error) && error.status === 409,
    );
  });
});

describe("reviewsService.createReview", () => {
  const users = { "seeker-1": reviewee, "publisher-1": reviewee };

  it("creates a review and aggregates the rating deterministically", async () => {
    const deps = createReviewDeps({ booking: completedBooking, users });
    const review = await reviewsService.createReview(
      "seeker-1",
      { bookingId: "bk_req-1", rating: 5, text: "Fixed everything quickly." },
      deps.reviewStore,
      deps.bookingStore,
      deps.userStore,
    );

    assert.equal(review.reviewId, "rv_req-1_seeker-1");
    assert.equal(review.revieweeId, "publisher-1");
    assert.equal(deps.ratingCalls.length, 1);
    const rating = (deps.ratingCalls[0] as { rating: { expectedCount: number; newAverage: number; newCount: number; newSum: number } }).rating;
    assert.deepEqual(rating, { revieweeId: "publisher-1", expectedCount: 2, newAverage: 4.3, newCount: 3, newSum: 13, timestamp: rating.timestamp });
  });

  it("rejects reviews on incomplete bookings", async () => {
    const deps = createReviewDeps({ booking, users });
    await assert.rejects(
      reviewsService.createReview("seeker-1", { bookingId: "bk_req-1", rating: 5, text: "Great" }, deps.reviewStore, deps.bookingStore, deps.userStore),
      (error: unknown) => isAppError(error) && error.status === 409,
    );
  });

  it("hides bookings from outsiders", async () => {
    const deps = createReviewDeps({ booking: completedBooking, users });
    await assert.rejects(
      reviewsService.createReview("stranger", { bookingId: "bk_req-1", rating: 5, text: "Great" }, deps.reviewStore, deps.bookingStore, deps.userStore),
      (error: unknown) => isAppError(error) && error.status === 404,
    );
  });

  it("rejects duplicate reviews", async () => {
    const existing: Review = {
      reviewId: "rv_req-1_seeker-1",
      bookingId: "bk_req-1",
      reviewerId: "seeker-1",
      reviewerName: "Seeker One",
      revieweeId: "publisher-1",
      rating: 5,
      text: "Great",
      createdAt: "2026-09-20T00:00:00.000Z",
    };
    const deps = createReviewDeps({ booking: completedBooking, users, existing });
    await assert.rejects(
      reviewsService.createReview("seeker-1", { bookingId: "bk_req-1", rating: 4, text: "Again" }, deps.reviewStore, deps.bookingStore, deps.userStore),
      (error: unknown) => isAppError(error) && error.status === 409,
    );
    assert.equal(deps.ratingCalls.length, 0);
  });

  it("retries the aggregation after a rating race", async () => {
    const deps = createReviewDeps({
      booking: completedBooking,
      users,
      ratingFailures: [transactionCanceled([{ Code: "None" }, { Code: "ConditionalCheckFailed" }])],
    });
    const review = await reviewsService.createReview(
      "seeker-1",
      { bookingId: "bk_req-1", rating: 5, text: "Great" },
      deps.reviewStore,
      deps.bookingStore,
      deps.userStore,
    );
    assert.equal(review.reviewId, "rv_req-1_seeker-1");
    assert.equal(deps.ratingCalls.length, 2);
  });
});

describe("reviewsService.listReviews", () => {
  it("requires a filter", async () => {
    const deps = createReviewDeps();
    await assert.rejects(
      reviewsService.listReviews({ limit: 20 } as never, deps.reviewStore),
      (error: unknown) => isAppError(error) && error.status === 400,
    );
  });
});

describe("createReviewSchema", () => {
  it("bounds the rating and requires text", () => {
    assert.equal(createReviewSchema.safeParse({ bookingId: "b", rating: 6, text: "x" }).success, false);
    assert.equal(createReviewSchema.safeParse({ bookingId: "b", rating: 5, text: "  " }).success, false);
    assert.equal(createReviewSchema.safeParse({ bookingId: "b", rating: 5, text: "Great work" }).success, true);
  });
});

describe("listReviewsQuerySchema", () => {
  it("requires revieweeId or bookingId", () => {
    assert.equal(listReviewsQuerySchema.safeParse({}).success, false);
    assert.equal(listReviewsQuerySchema.safeParse({ revieweeId: "u1" }).success, true);
  });
});
