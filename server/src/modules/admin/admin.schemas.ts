import { z } from "zod";

export const setUserStatusSchema = z
  .object({
    status: z.enum(["ACTIVE", "SUSPENDED", "DISABLED"]),
  })
  .strict();

export const setContactStatusSchema = z
  .object({
    status: z.enum(["NEW", "IN_REVIEW", "RESOLVED"]),
  })
  .strict();

export const listReportsQuerySchema = z
  .object({
    status: z.enum(["OPEN", "REVIEWED", "DISMISSED"]).optional(),
    limit: z.coerce.number().int("Limit must be a whole number").min(1, "Limit must be at least 1").max(50, "Limit must be at most 50").default(20),
    cursor: z.string().trim().min(1, "Cursor must not be blank").max(4096, "Cursor is too long").optional(),
  })
  .strict();

export const setReportStatusSchema = z
  .object({
    status: z.enum(["REVIEWED", "DISMISSED"]),
  })
  .strict();

export const reportIdParamsSchema = z
  .object({
    reportId: z.string().trim().min(1, "Report ID is required").max(128, "Report ID is too long"),
  })
  .strict();

export type SetUserStatusInput = z.infer<typeof setUserStatusSchema>;
export type SetContactStatusInput = z.infer<typeof setContactStatusSchema>;
export type ListReportsQuery = z.infer<typeof listReportsQuerySchema>;
export type SetReportStatusInput = z.infer<typeof setReportStatusSchema>;
