import { apiRequest } from "@/lib/api/client";
import type { AuthUser } from "@/lib/auth/types";
import type { ProfileUpdateInput, PublicUserProfile } from "./types";

export const usersApi = {
  getMyProfile() {
    return apiRequest<{ user: AuthUser }>("/users/me", { auth: true });
  },

  updateMyProfile(input: ProfileUpdateInput) {
    return apiRequest<{ user: AuthUser }>("/users/me", {
      method: "PATCH",
      body: input,
      auth: true,
    });
  },

  getPublicProfile(userId: string) {
    return apiRequest<{ user: PublicUserProfile }>(
      `/users/${encodeURIComponent(userId)}`,
      { auth: true },
    );
  },
};
