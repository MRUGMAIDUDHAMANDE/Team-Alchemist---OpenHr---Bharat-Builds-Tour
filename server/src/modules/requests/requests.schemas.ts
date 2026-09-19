import { z } from "zod";

export const requestIdParamsSchema = z
  .object({
    requestId: z.string().trim().min(1, "Request ID is required").max(128, "Request ID is too long"),
  })
  .strict();

export const createRequestSchema = z
  .object({
    availabilityId: z.string().trim().min(1, "Availability ID is required").max(128, "Availability ID is too long"),
    message: z.string().trim().min(1, "Describe what you need help with.").max(500, "Message must be at most 500 characters"),
  })
  .strict();

export const listRequestsQuerySchema = z
  .object({
    role: z.enum(["seeker", "publisher"]),
    status: z.enum(["PENDING", "ACCEPTED", "REJECTED", "CANCELLED", "EXPIRED"]).optional(),
    limit: z.coerce.number().int("Limit must be a whole number").min(1, "Limit must be at least 1").max(50, "Limit must be at most 50").default(20),
    cursor: z.string().trim().min(1, "Cursor must not be blank").max(4096, "Cursor is too long").optional(),
  })
  .strict();

export type RequestIdParams = z.infer<typeof requestIdParamsSchema>;
export type CreateRequestInput = z.infer<typeof createRequestSchema>;
export type ListRequestsQuery = z.infer<typeof listRequestsQuerySchema>;
