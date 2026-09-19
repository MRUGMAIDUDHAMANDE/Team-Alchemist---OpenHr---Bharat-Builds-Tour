export type UserRole = "USER" | "ADMIN";

export type UserStatus = "UNCONFIRMED" | "ACTIVE" | "SUSPENDED" | "DISABLED";

export type AvailabilityMode = "ONLINE" | "IN_PERSON" | "ANY";

export type VerificationStatus = "UNVERIFIED" | "PENDING" | "VERIFIED";

/**
 * The canonical user profile stored in DynamoDB.
 *
 * `userId` is the Cognito `sub` claim, which is the only identifier we persist
 * here. Cognito owns credentials; this table owns the product profile.
 */
export interface UserProfile {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;

  bio: string | null;
  profilePhotoKey: string | null;
  skills: string[];
  experience: string | null;
  hourlyRate: number | null;
  location: string | null;
  serviceRadiusKm: number | null;
  languages: string[];
  preferredMode: AvailabilityMode;

  ratingAverage: number;
  ratingCount: number;
  ratingSum?: number;
  completedBookings: number;
  verificationStatus: VerificationStatus;

  createdAt: string;
  updatedAt: string;
}

/**
 * Public projection of a profile. Never expose email, role, moderation status
 * or verification internals on a public profile (PRODUCT.md §4.2).
 */
export interface PublicUserProfile {
  userId: string;
  name: string;
  profilePhotoKey: string | null;
  bio: string | null;
  skills: string[];
  experience: string | null;
  hourlyRate: number | null;
  location: string | null;
  serviceRadiusKm: number | null;
  languages: string[];
  preferredMode: AvailabilityMode;
  ratingAverage: number;
  ratingCount: number;
  completedBookings: number;
  verificationStatus: VerificationStatus;
  createdAt: string;
}

/** Profile as seen by the owner of the account (self). */
export interface PrivateUserProfile extends PublicUserProfile {
  email: string;
  role: UserRole;
  status: UserStatus;
  updatedAt: string;
}

export function toPublicProfile(user: UserProfile): PublicUserProfile {
  return {
    userId: user.userId,
    name: user.name,
    profilePhotoKey: user.profilePhotoKey,
    bio: user.bio,
    skills: user.skills,
    experience: user.experience,
    hourlyRate: user.hourlyRate,
    location: user.location,
    serviceRadiusKm: user.serviceRadiusKm,
    languages: user.languages,
    preferredMode: user.preferredMode,
    ratingAverage: user.ratingAverage,
    ratingCount: user.ratingCount,
    completedBookings: user.completedBookings,
    verificationStatus: user.verificationStatus,
    createdAt: user.createdAt,
  };
}

export function toPrivateProfile(user: UserProfile): PrivateUserProfile {
  return {
    ...toPublicProfile(user),
    email: user.email,
    role: user.role,
    status: user.status,
    updatedAt: user.updatedAt,
  };
}
