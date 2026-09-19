import { AppError } from "../../lib/errors";
import { toPrivateProfile, toPublicProfile, type PrivateUserProfile, type PublicUserProfile, type UserProfile } from "./users.types";
import type { ProfileUpdate } from "./users.repository";
import type { UpdateProfileInput } from "./users.schemas";

export interface ProfileStore {
  getById(userId: string): Promise<UserProfile | null>;
  updateProfile(userId: string, patch: ProfileUpdate): Promise<UserProfile>;
}

export const usersService = {
  async getOwnProfile(userId: string, store: ProfileStore): Promise<PrivateUserProfile> {
    const profile = await store.getById(userId);
    if (!profile) {
      throw AppError.notFound("Profile not found");
    }
    return toPrivateProfile(profile);
  },

  async updateOwnProfile(userId: string, patch: UpdateProfileInput, store: ProfileStore): Promise<PrivateUserProfile> {
    const profile = await store.getById(userId);
    if (!profile) {
      throw AppError.notFound("Profile not found");
    }
    if (profile.status === "SUSPENDED" || profile.status === "DISABLED") {
      throw AppError.forbidden("This account cannot update its profile");
    }
    const updated = await store.updateProfile(userId, patch);
    return toPrivateProfile(updated);
  },

  async getPublicProfile(userId: string, store: ProfileStore): Promise<PublicUserProfile> {
    const profile = await store.getById(userId);
    if (!profile || profile.status !== "ACTIVE") {
      throw AppError.notFound("Profile not found");
    }
    return toPublicProfile(profile);
  },
};
