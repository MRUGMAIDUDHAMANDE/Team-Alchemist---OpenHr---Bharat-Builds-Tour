import { z } from "zod";
import { nameSchema } from "./auth";

export function parseCsv(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function csvField(itemMax: number, maxItems: number, field: string) {
  return z
    .string()
    .trim()
    .max(600, `${field} must be at most 600 characters`)
    .superRefine((value, context) => {
      const items = parseCsv(value);
      if (items.some((item) => item.length > itemMax)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Each ${field.toLowerCase().replace(/s$/, "")} must be at most ${itemMax} characters`,
        });
      }
      if (items.length > maxItems) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Provide at most ${maxItems} ${field.toLowerCase()}`,
        });
      }
    })
    .optional();
}

function optionalText(max: number, field: string) {
  return z.string().trim().max(max, `${field} must be at most ${max} characters`).optional();
}

const optionalHourlyRate = z
  .union([z.literal(""), z.coerce.number().int("Hourly rate must be a whole number").positive("Hourly rate must be greater than zero").max(1000000, "Hourly rate must be at most 1000000")])
  .optional();

const optionalServiceRadius = z
  .union([z.literal(""), z.coerce.number().int("Service radius must be a whole number").min(0, "Service radius cannot be negative").max(500, "Service radius must be at most 500 km")])
  .optional();

export const profileFormSchema = z.object({
  name: nameSchema,
  bio: optionalText(1000, "Bio"),
  skillsCsv: csvField(40, 20, "Skills"),
  experience: optionalText(2000, "Experience"),
  hourlyRate: optionalHourlyRate,
  location: optionalText(120, "Location"),
  serviceRadiusKm: optionalServiceRadius,
  languagesCsv: csvField(40, 20, "Languages"),
  preferredMode: z.enum(["ONLINE", "IN_PERSON", "ANY"]),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
