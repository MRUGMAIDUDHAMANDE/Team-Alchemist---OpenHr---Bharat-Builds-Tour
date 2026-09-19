import type { AuthUser, AvailabilityMode } from "@/lib/auth/types";

export type PublicUserProfile = Omit<AuthUser, "email" | "role" | "status" | "updatedAt">;

export interface ProfileUpdateInput {
  name?: string;
  bio?: string | null;
  skills?: string[];
  experience?: string | null;
  hourlyRate?: number | null;
  location?: string | null;
  serviceRadiusKm?: number | null;
  languages?: string[];
  preferredMode?: AvailabilityMode;
}
