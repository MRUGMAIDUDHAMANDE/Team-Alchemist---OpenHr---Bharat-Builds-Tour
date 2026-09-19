import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSearchQuery, matchesSearchText } from "../src/modules/availability/availability.search";
import { createAvailabilitySchema, searchAvailabilityQuerySchema, updateAvailabilitySchema, type CreateAvailabilityInput } from "../src/modules/availability/availability.schemas";
import { availabilityService, type AvailabilityStore, type PublisherDirectory } from "../src/modules/availability/availability.service";
import { decodePageCursor, encodePageCursor } from "../src/modules/availability/availability.pagination";
import { isAppError } from "../src/lib/errors";
import type { AvailabilitySlot } from "../src/modules/availability/availability.types";
import type { UserProfile } from "../src/modules/users/users.types";

const NOW = Date.parse("2026-09-19T12:00:00+05:30");
const START = new Date(NOW + 24 * 60 * 60 * 1000).toISOString();
const END = new Date(NOW + 26 * 60 * 60 * 1000).toISOString();

const profile: UserProfile = {
  userId: "publisher-123",
  email: "rahul@example.com",
  name: "Rahul Sharma",
  role: "USER",
  status: "ACTIVE",
  bio: null,
  profilePhotoKey: null,
  skills: ["Python"],
  experience: null,
  hourlyRate: 700,
  location: "Pune",
  serviceRadiusKm: 10,
  languages: ["English"],
  preferredMode: "ONLINE",
  ratingAverage: 4.8,
  ratingCount: 12,
  completedBookings: 9,
  verificationStatus: "VERIFIED",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

const slot: AvailabilitySlot = {
  availabilityId: "slot-123",
  publisherId: "publisher-123",
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
  createdAt: "2026-09-19T00:00:00.000Z",
  updatedAt: "2026-09-19T00:00:00.000Z",
};

const input: CreateAvailabilityInput = {
  skills: [" Python ", "APIs"],
  startTime: START,
  endTime: END,
  location: "Pune",
  serviceRadiusKm: 10,
  hourlyRate: 700,
  mode: "ONLINE",
};

function createPublisher(current: UserProfile | null = profile) {
  const requested: string[] = [];
  const store: PublisherDirectory = {
    async getById(userId: string) {
      requested.push(userId);
      return current;
    },
  };
  return { store, requested };
}

function createAvailability(current: AvailabilitySlot | null = slot, updateError?: unknown) {
  const created: AvailabilitySlot[] = [];
  const listed: Array<{ publisherId: string; filter: unknown }> = [];
  const searched: Array<unknown> = [];
  const updated: Array<{ availabilityId: string; publisherId: string; update: unknown }> = [];
  const store: AvailabilityStore = {
    async create(value: AvailabilitySlot) {
      created.push(value);
      return value;
    },
    async getById() {
      return current;
    },
    async listByPublisher(publisherId: string, filter) {
      listed.push({ publisherId, filter });
      return { items: current ? [current] : [], lastKey: { availabilityId: "next-slot" } };
    },
    async searchAvailable(search) {
      searched.push(search);
      return { items: current ? [current] : [], lastKey: { availabilityId: "next-slot" } };
    },
    async updateOwned(availabilityId: string, publisherId: string, update) {
      updated.push({ availabilityId, publisherId, update });
      if (updateError) throw updateError;
      assert.ok(current);
      return { ...current, ...update.patch } as AvailabilitySlot;
    },
  };
  return { store, created, listed, searched, updated };
}

function conditionalError(): Error {
  const error = new Error("The conditional request failed");
  error.name = "ConditionalCheckFailedException";
  return error;
}

describe("availabilityService.createAvailability", () => {
  it("snapshots the active publisher and validates the window", async () => {
    const availability = createAvailability(null);
    const publisher = createPublisher();
    const result = await availabilityService.createAvailability("publisher-123", input, availability.store, publisher.store, NOW);

    assert.match(result.availabilityId, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    assert.equal(result.publisherId, "publisher-123");
    assert.equal(result.publisherName, "Rahul Sharma");
    assert.equal(result.publisherRatingCount, 12);
    assert.deepEqual(result.skills, ["Python", "APIs"]);
    assert.equal(result.status, "AVAILABLE");
    assert.equal(availability.created.length, 1);
  });

  it("rejects publishing from an inactive account", async () => {
    const availability = createAvailability(null);
    const publisher = createPublisher({ ...profile, status: "SUSPENDED" });

    await assert.rejects(
      availabilityService.createAvailability("publisher-123", input, availability.store, publisher.store, NOW),
      (error: unknown) => isAppError(error) && error.status === 403,
    );
    assert.equal(availability.created.length, 0);
  });

  it("rejects a window in the past", async () => {
    const availability = createAvailability(null);
    const publisher = createPublisher();

    await assert.rejects(
      availabilityService.createAvailability(
        "publisher-123",
        { ...input, startTime: "2000-01-01T10:00:00.000Z", endTime: "2000-01-01T12:00:00.000Z" },
        availability.store,
        publisher.store,
        NOW,
      ),
      (error: unknown) => isAppError(error) && error.status === 400,
    );
  });
});

describe("availabilityService.listMine", () => {
  it("passes the owner filter and returns the next cursor", async () => {
    const availability = createAvailability();
    const cursor = encodePageCursor({ availabilityId: "slot-1" });
    assert.ok(cursor);

    const page = await availabilityService.listMine(
      "publisher-123",
      { status: "AVAILABLE", limit: 20, cursor },
      availability.store,
    );

    assert.equal(page.items.length, 1);
    assert.equal(page.nextCursor, encodePageCursor({ availabilityId: "next-slot" }));
    assert.deepEqual(availability.listed[0]?.publisherId, "publisher-123");
    assert.deepEqual((availability.listed[0]?.filter as { exclusiveStartKey?: unknown }).exclusiveStartKey, { availabilityId: "slot-1" });
  });

  it("rejects an invalid cursor", async () => {
    const availability = createAvailability();
    await assert.rejects(
      availabilityService.listMine("publisher-123", { limit: 20, cursor: "not-a-cursor" }, availability.store),
      (error: unknown) => isAppError(error) && error.status === 400,
    );
  });
});

describe("availabilityService.updateMine", () => {
  it("rejects another publisher's slot", async () => {
    const availability = createAvailability();
    const publisher = createPublisher();

    await assert.rejects(
      availabilityService.updateMine("publisher-999", "slot-123", { location: "Mumbai" }, availability.store, publisher.store, NOW),
      (error: unknown) => isAppError(error) && error.status === 404,
    );
    assert.equal(availability.updated.length, 0);
  });

  it("rejects changes to a booked slot", async () => {
    const availability = createAvailability({ ...slot, status: "BOOKED" });
    const publisher = createPublisher();

    await assert.rejects(
      availabilityService.updateMine("publisher-123", "slot-123", { location: "Mumbai" }, availability.store, publisher.store, NOW),
      (error: unknown) => isAppError(error) && error.status === 409,
    );
  });

  it("validates the effective window when only one endpoint changes", async () => {
    const availability = createAvailability();
    const publisher = createPublisher();

    await assert.rejects(
      availabilityService.updateMine("publisher-123", "slot-123", { endTime: START }, availability.store, publisher.store, NOW),
      (error: unknown) => isAppError(error) && error.status === 400,
    );
  });
});

describe("availabilityService.cancelMine", () => {
  it("maps a raced status change to a conflict", async () => {
    const availability = createAvailability(slot, conditionalError());

    await assert.rejects(
      availabilityService.cancelMine("publisher-123", "slot-123", availability.store),
      (error: unknown) => isAppError(error) && error.status === 409,
    );
  });
});

describe("availabilityService.getPublic", () => {
  it("hides cancelled slots", async () => {
    const availability = createAvailability({ ...slot, status: "CANCELLED" });
    await assert.rejects(
      availabilityService.getPublic("slot-123", availability.store),
      (error: unknown) => isAppError(error) && error.status === 404,
    );
  });
});

describe("createAvailabilitySchema", () => {
  it("rejects protected fields and invalid windows", () => {
    const protectedResult = createAvailabilitySchema.safeParse({ ...input, status: "BOOKED", publisherId: "someone-else" });
    assert.equal(protectedResult.success, false);
    if (!protectedResult.success) {
      assert.ok(protectedResult.error.flatten().fieldErrors.status);
      assert.ok(protectedResult.error.flatten().fieldErrors.publisherId);
    }

    assert.equal(
      createAvailabilitySchema.safeParse({ ...input, startTime: END, endTime: START }).success,
      false,
    );
  });
});

describe("updateAvailabilitySchema", () => {
  it("requires at least one editable field", () => {
    assert.equal(updateAvailabilitySchema.safeParse({}).success, false);
    assert.equal(updateAvailabilitySchema.safeParse({ location: "Mumbai" }).success, true);
  });
});

describe("availabilityService.searchAvailable", () => {
  it("queries only available slots and applies text matching", async () => {
    const availability = createAvailability();
    const page = await availabilityService.searchAvailable(
      { mode: "ANY", limit: 20, skills: ["python"], location: "pune" },
      availability.store,
      NOW,
    );

    assert.equal(page.items.length, 1);
    assert.equal(page.nextCursor, encodePageCursor({ availabilityId: "next-slot" }));
    const sent = availability.searched[0] as { keyCondition: string; values: Record<string, unknown> };
    assert.ok(sent.keyCondition.includes("#status = :status"));
    assert.equal(sent.values[":status"], "AVAILABLE");
  });

  it("drops slots that fail the text filter", async () => {
    const availability = createAvailability();
    const page = await availabilityService.searchAvailable(
      { mode: "ANY", limit: 20, skills: ["Plumbing"] },
      availability.store,
      NOW,
    );

    assert.equal(page.items.length, 0);
    assert.equal(page.nextCursor, encodePageCursor({ availabilityId: "next-slot" }));
  });
});

describe("buildSearchQuery", () => {
  it("builds key, overlap, rate, rating, and mode conditions", () => {
    const plan = buildSearchQuery({
      to: END,
      maxHourlyRate: 800,
      minRating: 4.5,
      mode: "ONLINE",
      limit: 20,
      effectiveFrom: START,
    });

    assert.equal(plan.keyCondition, "#status = :status AND #startTime <= :to");
    assert.ok(plan.filterExpression?.includes("#endTime > :from"));
    assert.ok(plan.filterExpression?.includes("#hourlyRate <= :maxHourlyRate"));
    assert.ok(plan.filterExpression?.includes("#publisherRatingAverage >= :minRating"));
    assert.ok(plan.filterExpression?.includes("(#mode = :mode OR #mode = :anyMode)"));
    assert.equal(plan.values[":status"], "AVAILABLE");
  });

  it("omits the mode filter when any mode is acceptable", () => {
    const plan = buildSearchQuery({ mode: "ANY", limit: 20, effectiveFrom: START });
    assert.ok(!plan.filterExpression?.includes("#mode"));
  });
});

describe("matchesSearchText", () => {
  it("matches skills case-insensitively and locations by substring", () => {
    assert.equal(matchesSearchText(slot, { skills: ["PYTHON"] }), true);
    assert.equal(matchesSearchText(slot, { skills: ["Plumbing"] }), false);
    assert.equal(matchesSearchText(slot, { location: "pun" }), true);
    assert.equal(matchesSearchText(slot, { location: "Mumbai" }), false);
    assert.equal(matchesSearchText(slot, {}), true);
  });
});

describe("searchAvailabilityQuerySchema", () => {
  it("parses comma-separated skills and defaults the mode", () => {
    const parsed = searchAvailabilityQuerySchema.parse({ skills: "React, Python", limit: "10" });
    assert.deepEqual(parsed.skills, ["React", "Python"]);
    assert.equal(parsed.mode, "ANY");
    assert.equal(parsed.limit, 10);
  });

  it("rejects an inverted time window", () => {
    assert.equal(
      searchAvailabilityQuerySchema.safeParse({ from: END, to: START }).success,
      false,
    );
  });
});

describe("availability pagination", () => {
  it("round-trips a cursor", () => {
    const cursor = encodePageCursor({ availabilityId: "slot-1" });
    assert.ok(cursor);
    assert.deepEqual(decodePageCursor(cursor), { availabilityId: "slot-1" });
    assert.equal(decodePageCursor(undefined), undefined);
    assert.equal(encodePageCursor(undefined), null);
  });
});
