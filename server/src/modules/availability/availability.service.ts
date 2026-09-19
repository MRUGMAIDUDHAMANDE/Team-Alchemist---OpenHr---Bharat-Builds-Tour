import { randomUUID } from "node:crypto";
import { AppError } from "../../lib/errors";
import { assertCreatableWindow, normalizeSkills } from "./availability.rules";
import { decodePageCursor, encodePageCursor } from "./availability.pagination";
import type { AvailabilitySlot, AvailabilityStatus } from "./availability.types";
import type { CreateAvailabilityInput, ListMineQuery, UpdateAvailabilityInput } from "./availability.schemas";
import type { availabilityRepository } from "./availability.repository";
import type { usersRepository } from "../users/users.repository";
import type { UserProfile } from "../users/users.types";

export type AvailabilityStore = Pick<typeof availabilityRepository, "create" | "getById" | "listByPublisher" | "updateOwned">;
export type PublisherDirectory = Pick<typeof usersRepository, "getById">;

export interface AvailabilityPage {
  items: AvailabilitySlot[];
  nextCursor: string | null;
}

function requireActivePublisher(profile: UserProfile | null): UserProfile {
  if (!profile) {
    throw AppError.notFound("Profile not found");
  }
  if (profile.status !== "ACTIVE") {
    throw AppError.forbidden("Only active accounts can publish availability");
  }
  return profile;
}

function requireOwnedAvailable(slot: AvailabilitySlot | null, publisherId: string): AvailabilitySlot {
  if (!slot || slot.publisherId !== publisherId) {
    throw AppError.notFound("Availability not found");
  }
  if (slot.status !== "AVAILABLE") {
    throw AppError.conflict("Only available slots can be changed.");
  }
  return slot;
}

function isConditionalCheckFailed(error: unknown): boolean {
  return error instanceof Error && error.name === "ConditionalCheckFailedException";
}

function snapshotPublisher(profile: UserProfile): Pick<AvailabilitySlot, "publisherName" | "publisherRatingAverage" | "publisherRatingCount" | "publisherCompletedBookings" | "publisherVerificationStatus"> {
  return {
    publisherName: profile.name,
    publisherRatingAverage: profile.ratingAverage,
    publisherRatingCount: profile.ratingCount,
    publisherCompletedBookings: profile.completedBookings,
    publisherVerificationStatus: profile.verificationStatus,
  };
}

export const availabilityService = {
  async createAvailability(
    publisherId: string,
    input: CreateAvailabilityInput,
    availabilityStore: AvailabilityStore,
    publisherStore: PublisherDirectory,
    now: number = Date.now(),
  ): Promise<AvailabilitySlot> {
    const profile = requireActivePublisher(await publisherStore.getById(publisherId));
    assertCreatableWindow(input.startTime, input.endTime, now);

    const timestamp = new Date().toISOString();
    return availabilityStore.create({
      availabilityId: randomUUID(),
      publisherId,
      ...snapshotPublisher(profile),
      skills: normalizeSkills(input.skills),
      startTime: input.startTime,
      endTime: input.endTime,
      location: input.location,
      serviceRadiusKm: input.serviceRadiusKm ?? null,
      hourlyRate: input.hourlyRate,
      mode: input.mode,
      status: "AVAILABLE",
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  },

  async listMine(
    publisherId: string,
    query: ListMineQuery,
    store: AvailabilityStore,
  ): Promise<AvailabilityPage> {
    const result = await store.listByPublisher(publisherId, {
      status: query.status,
      from: query.from,
      to: query.to,
      limit: query.limit,
      exclusiveStartKey: decodePageCursor(query.cursor),
    });
    return { items: result.items, nextCursor: encodePageCursor(result.lastKey) };
  },

  async getMine(publisherId: string, availabilityId: string, store: AvailabilityStore): Promise<AvailabilitySlot> {
    const slot = await store.getById(availabilityId);
    if (!slot || slot.publisherId !== publisherId) {
      throw AppError.notFound("Availability not found");
    }
    return slot;
  },

  async updateMine(
    publisherId: string,
    availabilityId: string,
    input: UpdateAvailabilityInput,
    availabilityStore: AvailabilityStore,
    publisherStore: PublisherDirectory,
    now: number = Date.now(),
  ): Promise<AvailabilitySlot> {
    const slot = requireOwnedAvailable(await availabilityStore.getById(availabilityId), publisherId);
    const profile = requireActivePublisher(await publisherStore.getById(publisherId));
    assertCreatableWindow(input.startTime ?? slot.startTime, input.endTime ?? slot.endTime, now);

    try {
      return await availabilityStore.updateOwned(availabilityId, publisherId, {
        patch: {
          ...(input.skills !== undefined ? { skills: normalizeSkills(input.skills) } : {}),
          ...(input.startTime !== undefined ? { startTime: input.startTime } : {}),
          ...(input.endTime !== undefined ? { endTime: input.endTime } : {}),
          ...(input.location !== undefined ? { location: input.location } : {}),
          ...(input.serviceRadiusKm !== undefined ? { serviceRadiusKm: input.serviceRadiusKm } : {}),
          ...(input.hourlyRate !== undefined ? { hourlyRate: input.hourlyRate } : {}),
          ...(input.mode !== undefined ? { mode: input.mode } : {}),
          ...snapshotPublisher(profile),
          updatedAt: new Date().toISOString(),
        },
        expectedStatus: "AVAILABLE",
      });
    } catch (error) {
      if (isConditionalCheckFailed(error)) {
        throw AppError.conflict("This slot is no longer available.");
      }
      throw error;
    }
  },

  async cancelMine(
    publisherId: string,
    availabilityId: string,
    store: AvailabilityStore,
  ): Promise<AvailabilitySlot> {
    requireOwnedAvailable(await store.getById(availabilityId), publisherId);

    try {
      return await store.updateOwned(availabilityId, publisherId, {
        patch: { status: "CANCELLED" as AvailabilityStatus, updatedAt: new Date().toISOString() },
        expectedStatus: "AVAILABLE",
      });
    } catch (error) {
      if (isConditionalCheckFailed(error)) {
        throw AppError.conflict("This slot is no longer available.");
      }
      throw error;
    }
  },

  async getPublic(availabilityId: string, store: AvailabilityStore): Promise<AvailabilitySlot> {
    const slot = await store.getById(availabilityId);
    if (!slot || slot.status === "CANCELLED" || slot.status === "EXPIRED") {
      throw AppError.notFound("Availability not found");
    }
    return slot;
  },
};
