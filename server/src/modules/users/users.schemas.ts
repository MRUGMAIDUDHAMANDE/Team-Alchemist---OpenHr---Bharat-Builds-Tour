import { z } from "zod";
import type { ProfileUpdate } from "./users.repository";

const nameSchema = z.string().trim().min(2, "Name must be at least 2 characters").max(80, "Name must be at most 80 characters");

const nullableText = (max: number, field: string) =>
  z.preprocess(
    (value) => (value === "" ? null : value),
    z.string().trim().max(max, `${field} must be at most ${max} characters`).nullable().optional(),
  );

const stringList = (itemMax: number, maxItems: number, field: string) =>
  z
    .array(z.string().trim().min(1, `${field} entries must not be blank`).max(itemMax, `${field} entries must be at most ${itemMax} characters`))
    .max(maxItems, `Provide at most ${maxItems} ${field.toLowerCase()}`)
    .transform((values) => {
      const seen = new Set<string>();
      const normalized: string[] = [];
      for (const value of values) {
        const key = value.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          normalized.push(value);
        }
      }
      return normalized;
    })
    .optional();

const nullablePositiveInt = (max: number, field: string) =>
  z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.number().int(`${field} must be a whole number`).positive(`${field} must be greater than zero`).max(max, `${field} must be at most ${max}`).nullable().optional(),
  );

const nullableRadius = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.number().int("Service radius must be a whole number").min(0, "Service radius cannot be negative").max(500, "Service radius must be at most 500 km").nullable().optional(),
);

export const userIdParamsSchema = z
  .object({
    userId: z.string().trim().min(1, "User ID is required").max(128, "User ID is too long"),
  })
  .strict();

const forbidden = (field: string) => z.never({ message: `${field} cannot be updated.` }).optional();

export const updateProfileSchema = z
  .object({
    name: nameSchema.optional(),
    bio: nullableText(1000, "Bio"),
    skills: stringList(40, 20, "Skills"),
    experience: nullableText(2000, "Experience"),
    hourlyRate: nullablePositiveInt(1000000, "Hourly rate"),
    location: nullableText(120, "Location"),
    serviceRadiusKm: nullableRadius,
    languages: stringList(40, 20, "Languages"),
    preferredMode: z.enum(["ONLINE", "IN_PERSON", "ANY"]).optional(),
    userId: forbidden("User ID"),
    email: forbidden("Email"),
    role: forbidden("Role"),
    status: forbidden("Status"),
    profilePhotoKey: forbidden("Profile photo"),
    ratingAverage: forbidden("Rating"),
    ratingCount: forbidden("Rating"),
    completedBookings: forbidden("Completed bookings"),
    verificationStatus: forbidden("Verification status"),
    createdAt: forbidden("Creation timestamp"),
    updatedAt: forbidden("Update timestamp"),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  });

export type UserIdParams = z.infer<typeof userIdParamsSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema> & ProfileUpdate;
