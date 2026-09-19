import type { AvailabilityMode } from "@/lib/auth/types";

export type AvailabilityStatus = "AVAILABLE" | "BOOKED" | "CANCELLED" | "EXPIRED";

export interface AvailabilitySlot {
  availabilityId: string;
  publisherId: string;
  publisherName: string;
  publisherRatingAverage: number;
  publisherRatingCount: number;
  publisherCompletedBookings: number;
  publisherVerificationStatus: "UNVERIFIED" | "PENDING" | "VERIFIED";
  skills: string[];
  startTime: string;
  endTime: string;
  location: string;
  serviceRadiusKm: number | null;
  hourlyRate: number;
  mode: AvailabilityMode;
  status: AvailabilityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilityPage {
  items: AvailabilitySlot[];
  nextCursor: string | null;
}

export interface CreateAvailabilityInput {
  skills: string[];
  startTime: string;
  endTime: string;
  location: string;
  serviceRadiusKm: number | null;
  hourlyRate: number;
  mode: AvailabilityMode;
}

export type UpdateAvailabilityInput = Partial<CreateAvailabilityInput>;

export interface MineAvailabilityFilter {
  status?: AvailabilityStatus;
  limit?: number;
  cursor?: string;
}
