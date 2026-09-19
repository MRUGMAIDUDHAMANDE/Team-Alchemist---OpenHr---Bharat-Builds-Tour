import type { AvailabilityMode, VerificationStatus } from "../users/users.types";

export type AvailabilityStatus = "AVAILABLE" | "BOOKED" | "CANCELLED" | "EXPIRED";

export interface AvailabilitySlot {
  availabilityId: string;
  publisherId: string;
  publisherName: string;
  publisherRatingAverage: number;
  publisherRatingCount: number;
  publisherCompletedBookings: number;
  publisherVerificationStatus: VerificationStatus;
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
