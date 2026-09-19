import { z } from "zod";
import type { AvailabilityMode } from "../auth/types";
import type { AvailabilitySlot } from "./types";
import { parseCsv } from "../validation/profile";

export function toLocalDate(value: Date): string {
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${value.getFullYear()}-${month}-${day}`;
}

export function toLocalTime(value: Date): string {
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function combineLocalDateTime(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    return null;
  }
  const result = new Date(`${date}T${time}:00`);
  return Number.isNaN(result.getTime()) ? null : result;
}

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date");
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a valid time");

const skillsCsvSchema = z
  .string()
  .trim()
  .min(1, "Add at least one skill")
  .max(600, "Skills must be at most 600 characters")
  .superRefine((value, context) => {
    const items = parseCsv(value);
    if (items.length > 8) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Provide at most 8 skills" });
    }
    if (items.some((item) => item.length < 2 || item.length > 40)) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Each skill must be 2 to 40 characters" });
    }
  });

const optionalServiceRadius = z
  .union([z.literal(""), z.coerce.number().int("Service radius must be a whole number").min(0, "Service radius cannot be negative").max(500, "Service radius must be at most 500 km")])
  .optional();

export const availabilityFormSchema = z
  .object({
    date: dateSchema,
    startTime: timeSchema,
    endTime: timeSchema,
    skillsCsv: skillsCsvSchema,
    location: z.string().trim().min(2, "Location must be at least 2 characters").max(120, "Location must be at most 120 characters"),
    hourlyRate: z.union([z.literal(""), z.coerce.number().int("Hourly rate must be a whole number").positive("Hourly rate must be greater than zero").max(1000000, "Hourly rate must be at most 1000000")]),
    serviceRadiusKm: optionalServiceRadius,
    mode: z.enum(["ONLINE", "IN_PERSON", "ANY"]),
  })
  .superRefine((values, context) => {
    const start = combineLocalDateTime(values.date, values.startTime);
    const end = combineLocalDateTime(values.date, values.endTime);
    if (!start || !end) return;

    if (end.getTime() <= start.getTime()) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["endTime"], message: "End time must be after start time" });
      return;
    }

    const duration = end.getTime() - start.getTime();
    if (start.getTime() <= Date.now()) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["startTime"], message: "Start time must be in the future" });
    }
    if (duration < 15 * 60 * 1000) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["endTime"], message: "Availability must last at least 15 minutes" });
    }
    if (duration > 12 * 60 * 60 * 1000) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["endTime"], message: "Availability must last at most 12 hours" });
    }
  });

export type AvailabilityFormValues = z.infer<typeof availabilityFormSchema>;

export function availabilityInitialValues(slot?: AvailabilitySlot, defaultMode: AvailabilityMode = "ANY"): AvailabilityFormValues {
  if (!slot) {
    return {
      date: "",
      startTime: "",
      endTime: "",
      skillsCsv: "",
      location: "",
      hourlyRate: "",
      serviceRadiusKm: "",
      mode: defaultMode,
    };
  }

  const start = new Date(slot.startTime);
  const end = new Date(slot.endTime);
  return {
    date: toLocalDate(start),
    startTime: toLocalTime(start),
    endTime: toLocalTime(end),
    skillsCsv: slot.skills.join(", "),
    location: slot.location,
    hourlyRate: slot.hourlyRate,
    serviceRadiusKm: slot.serviceRadiusKm ?? "",
    mode: slot.mode,
  };
}
