import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { updateProfileSchema, type UpdateProfileInput } from "../src/modules/users/users.schemas";
import { usersService, type ProfileStore } from "../src/modules/users/users.service";
import { isAppError } from "../src/lib/errors";
import type { UserProfile } from "../src/modules/users/users.types";

const activeProfile: UserProfile = {
  userId: "user-123",
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
  ratingAverage: 0,
  ratingCount: 0,
  completedBookings: 0,
  verificationStatus: "UNVERIFIED",
  createdAt: "2026-09-19T00:00:00.000Z",
  updatedAt: "2026-09-19T00:00:00.000Z",
};

function createStore(profile: UserProfile | null) {
  const requestedIds: string[] = [];
  const updates: Array<{ userId: string; patch: UpdateProfileInput }> = [];
  const store: ProfileStore = {
    async getById(userId: string) {
      requestedIds.push(userId);
      return profile;
    },
    async updateProfile(userId: string, patch: UpdateProfileInput) {
      updates.push({ userId, patch });
      assert.ok(profile);
      return { ...profile, ...patch, updatedAt: "2026-09-19T01:00:00.000Z" };
    },
  };
  return { store, requestedIds, updates };
}

describe("usersService.updateOwnProfile", () => {
  it("writes only through the authenticated user's identifier", async () => {
    const fixture = createStore(activeProfile);
    const result = await usersService.updateOwnProfile(
      "user-123",
      { name: "Rahul S", skills: ["Python"] },
      fixture.store,
    );

    assert.deepEqual(fixture.requestedIds, ["user-123"]);
    assert.deepEqual(fixture.updates, [{ userId: "user-123", patch: { name: "Rahul S", skills: ["Python"] } }]);
    assert.equal(result.name, "Rahul S");
    assert.deepEqual(result.skills, ["Python"]);
    assert.equal(result.email, "rahul@example.com");
  });

  it("rejects profile changes for suspended accounts", async () => {
    const fixture = createStore({ ...activeProfile, status: "SUSPENDED" });
    await assert.rejects(
      usersService.updateOwnProfile("user-123", { name: "Rahul S" }, fixture.store),
      (error: unknown) => isAppError(error) && error.status === 403,
    );
    assert.equal(fixture.updates.length, 0);
  });

  it("returns not found when the authenticated user has no profile row", async () => {
    const fixture = createStore(null);
    await assert.rejects(
      usersService.updateOwnProfile("user-123", { name: "Rahul S" }, fixture.store),
      (error: unknown) => isAppError(error) && error.status === 404,
    );
    assert.equal(fixture.updates.length, 0);
  });
});

describe("usersService.getPublicProfile", () => {
  it("returns only the public projection", async () => {
    const fixture = createStore(activeProfile);
    const result = await usersService.getPublicProfile("user-123", fixture.store);

    assert.deepEqual(fixture.requestedIds, ["user-123"]);
    assert.equal(result.name, "Rahul Sharma");
    assert.ok(!("email" in result));
    assert.ok(!("role" in result));
    assert.ok(!("status" in result));
    assert.ok(!("updatedAt" in result));
  });

  it("does not expose inactive profiles", async () => {
    const fixture = createStore({ ...activeProfile, status: "UNCONFIRMED" });
    await assert.rejects(
      usersService.getPublicProfile("user-123", fixture.store),
      (error: unknown) => isAppError(error) && error.status === 404,
    );
  });
});

describe("updateProfileSchema", () => {
  it("trims and deduplicates list input", () => {
    const parsed = updateProfileSchema.parse({
      skills: [" Python ", "python", "APIs"],
      languages: ["English", " english "],
    });

    assert.deepEqual(parsed.skills, ["Python", "APIs"]);
    assert.deepEqual(parsed.languages, ["English"]);
  });

  it("rejects protected and unknown fields", () => {
    const result = updateProfileSchema.safeParse({
      name: "Rahul S",
      email: "hacker@example.com",
      role: "ADMIN",
      status: "ACTIVE",
      ratingAverage: 5,
    });

    assert.equal(result.success, false);
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors;
      assert.ok(fields.email);
      assert.ok(fields.role);
      assert.ok(fields.status);
      assert.ok(fields.ratingAverage);
    }
  });

  it("rejects an empty patch, invalid rate, and invalid mode", () => {
    assert.equal(updateProfileSchema.safeParse({}).success, false);
    assert.equal(updateProfileSchema.safeParse({ hourlyRate: 0 }).success, false);
    assert.equal(updateProfileSchema.safeParse({ preferredMode: "REMOTE" }).success, false);
  });
});
