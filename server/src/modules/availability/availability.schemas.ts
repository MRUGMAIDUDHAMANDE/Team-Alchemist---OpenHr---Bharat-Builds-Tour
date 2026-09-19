import { z } from "zod";
import type { AvailabilitySlot } from "./availability.types";
import { assertCreatableWindow, normalizeSkills } from "./availability.rules";

const isoDateTime = (field: string) =>
  z.string().trim().datetime({ offset: true, message: `${field} must be a valid ISO date and time.` });

const skillSchema = z.string().trim().min(2, "Skills must name at least 2 characters").max(40, "Skills must be at most 40 characters");

const skillsSchema = z
  .array(skillSchema)
  .min(1, "Add at least one skill.")
  .max(8, "Provide at most 8 skills.")
  .transform((values) => normalizeSkills(values));

const locationSchema = z.string().trim().min(2, "Location must be at least 2 characters").max(120, "Location must be at most 120 characters");

const hourlyRateSchema = z.number().int("Hourly rate must be a whole number").positive("Hourly rate must be greater than zero").max(1000000, "Hourly rate must be at most 1000000");

const serviceRadiusSchema = z.number().int("Service radius must be a whole number").min(0, "Service radius cannot be negative").max(500, "Service radius must be at most 500 km").nullable().optional();

const modeSchema = z.enum(["ONLINE", "IN_PERSON", "ANY"]);

const forbidden = (field: string) => z.never({ message: `${field} cannot be set directly.` }).optional();

function checkWindow(value: { startTime: string; endTime: string }, context: z.RefinementCtx): void {
  try {
    assertCreatableWindow(value.startTime, value.endTime);
  } catch (error) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["startTime"],
      message: error instanceof Error ? error.message : "Availability window is invalid.",
    });
  }
}

export const createAvailabilitySchema = z
  .object({
    skills: skillsSchema,
    startTime: isoDateTime("Start time"),
    endTime: isoDateTime("End time"),
    location: locationSchema,
    serviceRadiusKm: serviceRadiusSchema,
    hourlyRate: hourlyRateSchema,
    mode: modeSchema,
    availabilityId: forbidden("Availability ID"),
    publisherId: forbidden("Publisher"),
    status: forbidden("Status"),
    createdAt: forbidden("Creation timestamp"),
    updatedAt: forbidden("Update timestamp"),
  })
  .strict()
  .superRefine(checkWindow);

export const updateAvailabilitySchema = z
  .object({
    skills: skillsSchema.optional(),
    startTime: isoDateTime("Start time").optional(),
    endTime: isoDateTime("End time").optional(),
    location: locationSchema.optional(),
    serviceRadiusKm: serviceRadiusSchema,
    hourlyRate: hourlyRateSchema.optional(),
    mode: modeSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  });

export const availabilityIdParamsSchema = z
  .object({
    availabilityId: z.string().trim().min(1, "Availability ID is required").max(128, "Availability ID is too long"),
  })
  .strict();

export const listMineQuerySchema = z
  .object({
    status: z.enum(["AVAILABLE", "BOOKED", "CANCELLED", "EXPIRED"]).optional(),
    from: isoDateTime("From time").optional(),
    to: isoDateTime("To time").optional(),
    limit: z.coerce.number().int("Limit must be a whole number").min(1, "Limit must be at least 1").max(50, "Limit must be at most 50").default(20),
    cursor: z.string().trim().min(1, "Cursor must not be blank").max(4096, "Cursor is too long").optional(),
  })
  .strict()
  .refine((value) => !value.from || !value.to || Date.parse(value.to) > Date.parse(value.from), {
    path: ["to"],
    message: "To time must be after from time.",
  });

export type CreateAvailabilityInput = Omit<z.infer<typeof createAvailabilitySchema>, "availabilityId" | "publisherId" | "status" | "createdAt" | "updatedAt">;
export type UpdateAvailabilityInput = z.infer<typeof updateAvailabilitySchema>;
export type AvailabilityIdParams = z.infer<typeof availabilityIdParamsSchema>;
export type ListMineQuery = z.infer<typeof listMineQuerySchema>;
export type AvailabilityRecord = AvailabilitySlot;
