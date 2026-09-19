import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bookingsService, type BookingStore } from "../src/modules/bookings/bookings.service";
import { computeTotal, requestsService, type FlagStore, type RequestStore, type SeekerDirectory, type SlotDirectory } from "../src/modules/requests/requests.service";
import { createRequestSchema, listRequestsQuerySchema } from "../src/modules/requests/requests.schemas";
import { isAppError } from "../src/lib/errors";
import type { AvailabilitySlot } from "../src/modules/availability/availability.types";
import type { Booking } from "../src/modules/bookings/bookings.types";
import type { BookingRequest } from "../src/modules/requests/requests.types";
import type { UserProfile } from "../src/modules/users/users.types";

const NOW = Date.parse("2026-09-19T12:00:00+05:30");
const START = new Date(NOW + 24 * 60 * 60 * 1000).toISOString();
const END = new Date(NOW + 26 * 60 * 60 * 1000).toISOString();

const profile = {
  userId: "seeker-1",
  email: "seeker@example.com",
  name: "Seeker One",
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
  ratingAverage: 0,
  ratingCount: 0,
  completedBookings: 0,
  verificationStatus: "UNVERIFIED",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
} as UserProfile;

const slot: AvailabilitySlot = {
  availabilityId: "slot-1",
  publisherId: "publisher-1",
  publisherName: "Rahul Sharma",
  publisherRatingAverage: 4.8,
  publisherRatingCount: 12,
  publisherCompletedBookings: 9,
  publisherVerificationStatus: "VERIFIED",
  skills: ["Python"],
  startTime: START,
  endTime: END,
  location: "Pune",
  serviceRadiusKm: 10,
  hourlyRate: 700,
  mode: "ONLINE",
  status: "AVAILABLE",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

function pendingRequest(overrides: Partial<BookingRequest> = {}): BookingRequest {
  return {
    requestId: "req-1",
    availabilityId: "slot-1",
    publisherId: "publisher-1",
    seekerId: "seeker-1",
    seekerName: "Seeker One",
    message: "Need help debugging.",
    status: "PENDING",
    createdAt: "2026-09-19T00:00:00.000Z",
    updatedAt: "2026-09-19T00:00:00.000Z",
    ...overrides,
  };
}

function createRequestStore(options: {
  requests?: BookingRequest[];
  acceptError?: unknown;
  transition?: (requestId: string, field: string, ownerId: string, to: BookingRequest["status"]) => BookingRequest;
} = {}) {
  const created: BookingRequest[] = [];
  const accepted: Array<unknown> = [];
  const store: RequestStore = {
    async create(request: BookingRequest) {
      created.push(request);
      return request;
    },
    async getById(requestId: string) {
      return options.requests?.find((request) => request.requestId === requestId) ?? null;
    },
    async listByAvailability() {
      return options.requests ?? [];
    },
    async listBySeeker() {
      return { items: options.requests ?? [] };
    },
    async listByPublisher() {
      return { items: options.requests ?? [] };
    },
    async transitionStatus(requestId: string, field: "publisherId" | "seekerId", ownerId: string, to: BookingRequest["status"]) {
      if (options.transition) return options.transition(requestId, field, ownerId, to);
      const current = options.requests?.find((request) => request.requestId === requestId);
      assert.ok(current);
      return { ...current, status: to };
    },
    async acceptAtomic(input: unknown) {
      accepted.push(input);
      if (options.acceptError) throw options.acceptError;
    },
  };
  return { store, created, accepted };
}

function createSlotStore(current: AvailabilitySlot | null = slot): SlotDirectory {
  return {
    async getById() {
      return current;
    },
  };
}

function createSeekerStore(current: UserProfile | null = profile): SeekerDirectory {
  return {
    async getById() {
      return current;
    },
  };
}

function createFlagStore() {
  const flagged: Array<unknown> = [];
  const store: FlagStore = {
    async create(report: never) {
      flagged.push(report);
      return report;
    },
    async getById() {
      return null;
    },
    async listByStatus() {
      return { items: [] };
    },
    async setStatus() {
      throw new Error("unreachable");
    },
  };
  return { store, flagged };
}

function createBookingStore(bookings: Booking[] = []): BookingStore {
  return {
    async getById(bookingId: string) {
      return bookings.find((booking) => booking.bookingId === bookingId) ?? null;
    },
    async listByPublisher() {
      return { items: bookings };
    },
    async listBySeeker() {
      return { items: bookings };
    },
  };
}

describe("requestsService.createRequest", () => {
  it("creates a pending request with the seeker's name", async () => {
    const requests = createRequestStore();
    const flags = createFlagStore();
    const result = await requestsService.createRequest(
      "seeker-1",
      { availabilityId: "slot-1", message: "Need help debugging." },
      requests.store,
      createSlotStore(),
      createSeekerStore(),
      flags.store,
      NOW,
    );

    assert.equal(result.status, "PENDING");
    assert.equal(result.seekerName, "Seeker One");
    assert.equal(result.publisherId, "publisher-1");
    assert.equal(requests.created.length, 1);
  });

  it("flags a request carrying contact details", async () => {
    const requests = createRequestStore();
    const flags = createFlagStore();
    await requestsService.createRequest(
      "seeker-1",
      { availabilityId: "slot-1", message: "Call me on 98765 43210, let's skip the platform." },
      requests.store,
      createSlotStore(),
      createSeekerStore(),
      flags.store,
      NOW,
    );

    assert.equal(flags.flagged.length, 1);
    assert.ok(flags.flagged[0].findings.some((finding) => finding.type === "PHONE"));
    assert.equal(requests.created.length, 1);
  });

  it("rejects self-requests", async () => {
    const requests = createRequestStore();
    await assert.rejects(
      requestsService.createRequest("publisher-1", { availabilityId: "slot-1", message: "Hi" }, requests.store, createSlotStore(), createSeekerStore(), createFlagStore().store, NOW),
      (error: unknown) => isAppError(error) && error.status === 403,
    );
    assert.equal(requests.created.length, 0);
  });

  it("rejects requests on booked slots", async () => {
    const requests = createRequestStore();
    await assert.rejects(
      requestsService.createRequest("seeker-1", { availabilityId: "slot-1", message: "Hi" }, requests.store, createSlotStore({ ...slot, status: "BOOKED" }), createSeekerStore(), createFlagStore().store, NOW),
      (error: unknown) => isAppError(error) && error.status === 409,
    );
  });

  it("rejects duplicate pending requests from the same seeker", async () => {
    const requests = createRequestStore({ requests: [pendingRequest()] });
    await assert.rejects(
      requestsService.createRequest("seeker-1", { availabilityId: "slot-1", message: "Hi again" }, requests.store, createSlotStore(), createSeekerStore(), createFlagStore().store, NOW),
      (error: unknown) => isAppError(error) && error.status === 409,
    );
  });
});

describe("requestsService.acceptRequest", () => {
  it("books atomically and returns the booking", async () => {
    const requests = createRequestStore({ requests: [pendingRequest()] });
    const result = await requestsService.acceptRequest("publisher-1", "req-1", requests.store, createSlotStore(), createSeekerStore());

    assert.equal(result.request.status, "ACCEPTED");
    assert.equal(result.booking.status, "CONFIRMED");
    assert.equal(result.booking.bookingId, "bk_req-1");
    assert.equal(result.booking.totalAmount, 1400);
    assert.equal(requests.accepted.length, 1);
  });

  it("rejects accepts from anyone but the publisher", async () => {
    const requests = createRequestStore({ requests: [pendingRequest()] });
    await assert.rejects(
      requestsService.acceptRequest("someone-else", "req-1", requests.store, createSlotStore(), createSeekerStore()),
      (error: unknown) => isAppError(error) && error.status === 404,
    );
    assert.equal(requests.accepted.length, 0);
  });

  it("maps a lost race to a conflict", async () => {
    const transactionError = new Error("Transaction cancelled");
    transactionError.name = "TransactionCanceledException";
    (transactionError as { CancellationReasons?: Array<{ Code?: string }> }).CancellationReasons = [
      { Code: "ConditionalCheckFailed" },
      { Code: "None" },
      { Code: "None" },
    ];
    const requests = createRequestStore({ requests: [pendingRequest()], acceptError: transactionError });

    await assert.rejects(
      requestsService.acceptRequest("publisher-1", "req-1", requests.store, createSlotStore(), createSeekerStore()),
      (error: unknown) => isAppError(error) && error.status === 409,
    );
  });
});

describe("requestsService.rejectRequest", () => {
  it("rejects a pending request", async () => {
    const requests = createRequestStore({ requests: [pendingRequest()] });
    const result = await requestsService.rejectRequest("publisher-1", "req-1", requests.store);
    assert.equal(result.status, "REJECTED");
  });
});

describe("requestsService.cancelRequest", () => {
  it("lets the seeker cancel a pending request", async () => {
    const requests = createRequestStore({ requests: [pendingRequest()] });
    const result = await requestsService.cancelRequest("seeker-1", "req-1", requests.store);
    assert.equal(result.status, "CANCELLED");
  });

  it("hides other seekers' requests", async () => {
    const requests = createRequestStore({ requests: [pendingRequest()] });
    await assert.rejects(
      requestsService.cancelRequest("seeker-2", "req-1", requests.store),
      (error: unknown) => isAppError(error) && error.status === 404,
    );
  });
});

describe("computeTotal", () => {
  it("prices a two-hour slot deterministically", () => {
    assert.equal(computeTotal(700, START, END), 1400);
  });

  it("rounds fractional hours to paise", () => {
    assert.equal(computeTotal(100, START, new Date(Date.parse(START) + 30 * 60000).toISOString()), 50);
  });
});

describe("createRequestSchema", () => {
  it("requires a message", () => {
    assert.equal(createRequestSchema.safeParse({ availabilityId: "slot-1", message: "  " }).success, false);
    assert.equal(createRequestSchema.safeParse({ availabilityId: "slot-1", message: "Help please" }).success, true);
  });
});

describe("listRequestsQuerySchema", () => {
  it("requires a role", () => {
    assert.equal(listRequestsQuerySchema.safeParse({}).success, false);
    assert.equal(listRequestsQuerySchema.safeParse({ role: "publisher" }).success, true);
  });
});

describe("bookingsService", () => {
  const booking: Booking = {
    bookingId: "bk_req-1",
    availabilityId: "slot-1",
    requestId: "req-1",
    publisherId: "publisher-1",
    seekerId: "seeker-1",
    hourlyRate: 700,
    startTime: START,
    endTime: END,
    totalAmount: 1400,
    status: "CONFIRMED",
    createdAt: "2026-09-19T00:00:00.000Z",
    updatedAt: "2026-09-19T00:00:00.000Z",
  };

  it("returns bookings to participants", async () => {
    const store = createBookingStore([booking]);
    assert.equal((await bookingsService.getBooking("seeker-1", "bk_req-1", store)).bookingId, "bk_req-1");
    assert.equal((await bookingsService.getBooking("publisher-1", "bk_req-1", store)).bookingId, "bk_req-1");
  });

  it("hides bookings from outsiders", async () => {
    const store = createBookingStore([booking]);
    await assert.rejects(
      bookingsService.getBooking("stranger", "bk_req-1", store),
      (error: unknown) => isAppError(error) && error.status === 404,
    );
  });

  it("lists bookings by role", async () => {
    const store = createBookingStore([booking]);
    const page = await bookingsService.listMine("seeker-1", { role: "seeker", limit: 20 }, store);
    assert.equal(page.items.length, 1);
    assert.equal(page.nextCursor, null);
  });
});
