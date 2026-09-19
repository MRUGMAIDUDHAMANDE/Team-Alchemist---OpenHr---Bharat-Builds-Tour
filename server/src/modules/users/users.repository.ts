import { GetCommand, PutCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../../aws/clients";
import { env } from "../../config/env";
import { AppError } from "../../lib/errors";
import type { AvailabilityMode, UserProfile, UserStatus } from "./users.types";

const nowIso = () => new Date().toISOString();

/** Fields a user is allowed to change about themselves. */
export interface ProfileUpdate {
  name?: string;
  bio?: string | null;
  skills?: string[];
  experience?: string | null;
  hourlyRate?: number | null;
  location?: string | null;
  serviceRadiusKm?: number | null;
  languages?: string[];
  preferredMode?: AvailabilityMode;
  profilePhotoKey?: string | null;
}

export function buildDefaultProfile(input: {
  userId: string;
  email: string;
  name: string;
  status: UserStatus;
}): UserProfile {
  const timestamp = nowIso();
  return {
    userId: input.userId,
    email: input.email,
    name: input.name,
    role: "USER",
    status: input.status,
    bio: null,
    profilePhotoKey: null,
    skills: [],
    experience: null,
    hourlyRate: null,
    location: null,
    serviceRadiusKm: null,
    languages: [],
    preferredMode: "ANY",
    ratingAverage: 0,
    ratingCount: 0,
    completedBookings: 0,
    verificationStatus: "UNVERIFIED",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export const usersRepository = {
  async getById(userId: string): Promise<UserProfile | null> {
    const result = await ddb.send(
      new GetCommand({
        TableName: env.DYNAMODB_USERS_TABLE,
        Key: { userId },
      }),
    );

    return (result.Item as UserProfile | undefined) ?? null;
  },

  /**
   * Create the profile only if it does not already exist. The conditional write
   * makes signup / login retries idempotent instead of overwriting state.
   */
  async createIfAbsent(profile: UserProfile): Promise<UserProfile> {
    try {
      await ddb.send(
        new PutCommand({
          TableName: env.DYNAMODB_USERS_TABLE,
          Item: profile,
          ConditionExpression: "attribute_not_exists(userId)",
        }),
      );
      return profile;
    } catch (error) {
      if (error instanceof Error && error.name === "ConditionalCheckFailedException") {
        const existing = await usersRepository.getById(profile.userId);
        if (existing) return existing;
      }
      throw error;
    }
  },

  /**
   * Ensure a profile row exists for an authenticated identity. Called after a
   * successful login so a user that was confirmed outside our signup path, or
   * created before a deploy, still gets a profile row.
   */
  async ensureFromIdentity(input: {
    userId: string;
    email: string;
    name: string;
  }): Promise<UserProfile> {
    const existing = await usersRepository.getById(input.userId);
    if (existing) return existing;

    return usersRepository.createIfAbsent(
      buildDefaultProfile({
        userId: input.userId,
        email: input.email,
        name: input.name,
        status: "ACTIVE",
      }),
    );
  },

  async setRole(userId: string, role: "USER" | "ADMIN"): Promise<void> {
    await ddb.send(
      new UpdateCommand({
        TableName: env.DYNAMODB_USERS_TABLE,
        Key: { userId },
        UpdateExpression: "SET #role = :role, updatedAt = :updatedAt",
        ExpressionAttributeNames: { "#role": "role" },
        ExpressionAttributeValues: { ":role": role, ":updatedAt": nowIso() },
        ConditionExpression: "attribute_exists(userId)",
      }),
    );
  },

  async setStatus(userId: string, status: UserStatus): Promise<void> {
    await ddb.send(
      new UpdateCommand({
        TableName: env.DYNAMODB_USERS_TABLE,
        Key: { userId },
        UpdateExpression: "SET #status = :status, updatedAt = :updatedAt",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":status": status, ":updatedAt": nowIso() },
        ConditionExpression: "attribute_exists(userId)",
      }),
    );
  },

  async updateProfile(userId: string, patch: ProfileUpdate): Promise<UserProfile> {
    const entries = Object.entries(patch).filter(([, value]) => value !== undefined);
    if (entries.length === 0) {
      const current = await usersRepository.getById(userId);
      if (!current) throw AppError.notFound("Profile not found");
      return current;
    }

    const names: Record<string, string> = { "#updatedAt": "updatedAt" };
    const values: Record<string, unknown> = { ":updatedAt": nowIso() };
    const assignments: string[] = ["#updatedAt = :updatedAt"];

    entries.forEach(([key, value], index) => {
      names[`#f${index}`] = key;
      values[`:v${index}`] = value;
      assignments.push(`#f${index} = :v${index}`);
    });

    const result = await ddb.send(
      new UpdateCommand({
        TableName: env.DYNAMODB_USERS_TABLE,
        Key: { userId },
        UpdateExpression: `SET ${assignments.join(", ")}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ConditionExpression: "attribute_exists(userId)",
        ReturnValues: "ALL_NEW",
      }),
    );

    return result.Attributes as UserProfile;
  },

  /** Used by the admin surface and dashboard metrics later on. */
  async list(): Promise<UserProfile[]> {
    const result = await ddb.send(new ScanCommand({ TableName: env.DYNAMODB_USERS_TABLE }));
    return (result.Items as UserProfile[] | undefined) ?? [];
  },
};
