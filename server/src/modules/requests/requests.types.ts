import type { AvailabilityMode } from "../users/users.types";

export type RequestStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED" | "EXPIRED";

export interface BookingRequest {
  requestId: string;
  availabilityId: string;
  publisherId: string;
  seekerId: string;
  seekerName: string;
  message: string;
  skills: string[];
  startTime: string;
  endTime: string;
  location: string;
  hourlyRate: number;
  mode: AvailabilityMode;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
}
