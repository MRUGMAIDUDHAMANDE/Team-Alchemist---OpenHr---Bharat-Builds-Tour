import { randomUUID } from "node:crypto";
import { AppError } from "../../lib/errors";
import { decodePageCursor, encodePageCursor } from "../availability/availability.pagination";
import type { AvailabilitySlot } from "../availability/availability.types";
import type { availabilityRepository } from "../availability/availability.repository";
import type { Booking } from "../bookings/bookings.types";
import type { usersRepository } from "../users/users.repository";
import type { UserProfile } from "../users/users.types";
import type { requestsRepository } from "./requests.repository";
import type { CreateRequestInput, ListRequestsQuery } from "./requests.schemas";
import type { BookingRequest } from "./requests.types";

export type RequestStore = Pick<typeof requestsRepository, "create" | "getById" | "listByAvailability" | "listBySeeker" | "listByPublisher" | "transitionStatus" | "acceptAtomic">;
export type SlotDirectory = Pick<typeof availabilityRepository, "getById">;
export type SeekerDirectory = Pick<typeof usersRepository, "getById">;

export interface RequestPage {
  items: BookingRequest[];
  nextCursor: string | null;
}

export function computeTotal(hourlyRate: number, startTime: string, endTime: string): number {
  const minutes = (Date.parse(endTime) - Date.parse(startTime)) / 60000;
  return Math.round(hourlyRate * (minutes / 60) * 100) / 100;
}

function requireActivePublisher(profile: UserProfile | null, action: string): UserProfile {
  if (!profile) {
    throw AppError.notFound("Profile not found");
  }
  if (profile.status !== "ACTIVE") {
    throw AppError.forbidden(`Only active accounts can ${action}.`);
  }
  return profile;
}

function requirePendingAsPublisher(request: BookingRequest | null, publisherId: string): BookingRequest {
  if (!request || request.publisherId !== publisherId) {
    throw AppError.notFound("Request not found");
  }
  if (request.status !== "PENDING") {
    throw AppError.conflict("This request is no longer pending.");
  }
  return request;
}

function isConditionalCheckFailed(error: unknown): boolean {
  return error instanceof Error && error.name === "ConditionalCheckFailedException";
}

interface CancellationReason {
  Code?: string;
  Message?: string;
}

function mapTransactionError(error: unknown): AppError {
  const reasons = (error as { CancellationReasons?: CancellationReason[] })?.CancellationReasons;
  if (Array.isArray(reasons)) {
    const failedIndex = reasons.findIndex((reason) => reason.Code && reason.Code !== "None");
    if (failedIndex === 0) {
      return AppError.conflict("This slot was just booked. Only one booking can win a contested slot.", "CONFLICT");
    }
    if (failedIndex === 1) {
      return AppError.conflict("This request is no longer pending.");
    }
    if (failedIndex > 1) {
      return AppError.conflict("Conflicting update. Refresh and try again.");
    }
  }
  return AppError.internal("Could not confirm the booking.", error);
}

export const requestsService = {
  async createRequest(
    seekerId: string,
    input: CreateRequestInput,
    requestStore: RequestStore,
    slotStore: SlotDirectory,
    seekerStore: SeekerDirectory,
    now: number = Date.now(),
  ): Promise<BookingRequest> {
    const slot = await slotStore.getById(input.availabilityId);
    if (!slot) {
      throw AppError.notFound("Availability not found");
    }
    if (slot.status !== "AVAILABLE") {
      throw AppError.conflict("This slot is no longer available.");
    }
    if (Date.parse(slot.endTime) <= now) {
      throw AppError.conflict("This slot has already ended.");
    }
    if (slot.publisherId === seekerId) {
      throw AppError.forbidden("You cannot request your own availability.");
    }

    const seeker = await seekerStore.getById(seekerId);
    if (!seeker) {
      throw AppError.notFound("Profile not found");
    }
    if (seeker.status !== "ACTIVE") {
      throw AppError.forbidden("Only active accounts can send requests.");
    }

    const existing = await requestStore.listByAvailability(input.availabilityId);
    if (existing.some((request) => request.seekerId === seekerId && request.status === "PENDING")) {
      throw AppError.conflict("You already have a pending request for this slot.");
    }

    const timestamp = new Date().toISOString();
    return requestStore.create({
      requestId: randomUUID(),
      availabilityId: slot.availabilityId,
      publisherId: slot.publisherId,
      seekerId,
      seekerName: seeker.name,
      message: input.message,
      skills: slot.skills,
      startTime: slot.startTime,
      endTime: slot.endTime,
      location: slot.location,
      hourlyRate: slot.hourlyRate,
      mode: slot.mode,
      status: "PENDING",
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  },

  async listMine(userId: string, query: ListRequestsQuery, store: RequestStore): Promise<RequestPage> {
    const result =
      query.role === "seeker"
        ? await store.listBySeeker(userId, query.status, query.limit, decodePageCursor(query.cursor))
        : await store.listByPublisher(userId, query.status, query.limit, decodePageCursor(query.cursor));
    return { items: result.items, nextCursor: encodePageCursor(result.lastKey) };
  },

  async acceptRequest(
    publisherId: string,
    requestId: string,
    requestStore: RequestStore,
    slotStore: SlotDirectory,
    publisherStore: SeekerDirectory,
  ): Promise<{ request: BookingRequest; booking: Booking }> {
    const request = requirePendingAsPublisher(await requestStore.getById(requestId), publisherId);
    const slot: AvailabilitySlot | null = await slotStore.getById(request.availabilityId);
    if (!slot || slot.status !== "AVAILABLE") {
      throw AppError.conflict("This slot is no longer available.");
    }
    const publisher = requireActivePublisher(await publisherStore.getById(publisherId), "accept requests");

    const others = await requestStore.listByAvailability(request.availabilityId);
    const timestamp = new Date().toISOString();
    const booking: Booking = {
      bookingId: `bk_${request.requestId}`,
      availabilityId: slot.availabilityId,
      requestId: request.requestId,
      publisherId: request.publisherId,
      publisherName: publisher.name,
      seekerId: request.seekerId,
      seekerName: request.seekerName,
      hourlyRate: slot.hourlyRate,
      startTime: slot.startTime,
      endTime: slot.endTime,
      totalAmount: computeTotal(slot.hourlyRate, slot.startTime, slot.endTime),
      status: "CONFIRMED",
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    try {
      await requestStore.acceptAtomic({
        availabilityId: slot.availabilityId,
        requestId: request.requestId,
        booking,
        otherPendingRequestIds: others
          .filter((item) => item.status === "PENDING" && item.requestId !== request.requestId)
          .map((item) => item.requestId),
        timestamp,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "TransactionCanceledException") {
        throw mapTransactionError(error);
      }
      throw error;
    }

    return {
      request: { ...request, status: "ACCEPTED" as const, updatedAt: timestamp },
      booking,
    };
  },

  async rejectRequest(publisherId: string, requestId: string, store: RequestStore): Promise<BookingRequest> {
    requirePendingAsPublisher(await store.getById(requestId), publisherId);
    try {
      return await store.transitionStatus(requestId, "publisherId", publisherId, "REJECTED");
    } catch (error) {
      if (isConditionalCheckFailed(error)) {
        throw AppError.conflict("This request is no longer pending.");
      }
      throw error;
    }
  },

  async cancelRequest(seekerId: string, requestId: string, store: RequestStore): Promise<BookingRequest> {
    const request = await store.getById(requestId);
    if (!request || request.seekerId !== seekerId) {
      throw AppError.notFound("Request not found");
    }
    if (request.status !== "PENDING") {
      throw AppError.conflict("Only pending requests can be cancelled.");
    }
    try {
      return await store.transitionStatus(requestId, "seekerId", seekerId, "CANCELLED");
    } catch (error) {
      if (isConditionalCheckFailed(error)) {
        throw AppError.conflict("This request is no longer pending.");
      }
      throw error;
    }
  },
};
