import { z } from "zod";

export const interpretQuerySchema = z
  .object({
    query: z.string().trim().min(3, "Describe what you need in a few words.").max(500, "Keep the description under 500 characters."),
  })
  .strict();

const modelOutputSchema = z.object({
  skills: z.array(z.string().trim().min(1).max(40)).max(8).default([]),
  location: z.string().trim().max(120).nullable().optional(),
  date: z.string().trim().max(32).nullable().optional(),
  startTime: z
    .string()
    .trim()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Model returned an invalid start time.")
    .nullable()
    .optional(),
  endTime: z
    .string()
    .trim()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Model returned an invalid end time.")
    .nullable()
    .optional(),
  maxHourlyRate: z.number().int().positive().max(1000000).nullable().optional(),
  mode: z.enum(["ONLINE", "IN_PERSON", "ANY"]).nullable().optional(),
});

export type InterpretQueryInput = z.infer<typeof interpretQuerySchema>;
export type ModelRequirements = z.infer<typeof modelOutputSchema>;

export function parseModelOutput(value: unknown): ModelRequirements {
  const parsed = modelOutputSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error("Model returned unusable requirements.");
  }
  return parsed.data;
}
