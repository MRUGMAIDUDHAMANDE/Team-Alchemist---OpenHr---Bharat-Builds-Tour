export type UserRole = "USER" | "ADMIN";
export type UserStatus = "UNCONFIRMED" | "ACTIVE" | "SUSPENDED" | "DISABLED";
export type AvailabilityMode = "ONLINE" | "IN_PERSON" | "ANY";
export type VerificationStatus = "UNVERIFIED" | "PENDING" | "VERIFIED";

/** Mirrors the server's PrivateUserProfile (the shape returned to the owner). */
export interface AuthUser {
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
  completedBookings: number;
  verificationStatus: VerificationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string | null;
  expiresIn: number;
  tokenType: string;
}

export interface LoginResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface SignupInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}
