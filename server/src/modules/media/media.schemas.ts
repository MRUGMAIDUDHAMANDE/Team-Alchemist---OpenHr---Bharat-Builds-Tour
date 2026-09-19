import { z } from "zod";

export const uploadUrlSchema = z
  .object({
    purpose: z.enum(["profile", "portfolio", "task"]),
    contentType: z.string().trim().min(1, "Content type is required").max(128, "Content type is too long"),
    sizeBytes: z.number().int("File size must be a whole number of bytes").positive("File size must be positive"),
  })
  .strict();

export const confirmUploadSchema = z
  .object({
    s3Key: z.string().trim().min(1, "File reference is required").max(512, "File reference is too long"),
  })
  .strict();

export const viewUrlQuerySchema = z
  .object({
    key: z.string().trim().min(1, "File reference is required").max(512, "File reference is too long"),
  })
  .strict();

export const mediaIdParamsSchema = z
  .object({
    mediaId: z.string().trim().min(1, "Media ID is required").max(128, "Media ID is too long"),
  })
  .strict();

export const listMediaQuerySchema = z
  .object({
    purpose: z.enum(["profile", "portfolio", "task"]).optional(),
    limit: z.coerce.number().int("Limit must be a whole number").min(1, "Limit must be at least 1").max(50, "Limit must be at most 50").default(20),
    cursor: z.string().trim().min(1, "Cursor must not be blank").max(4096, "Cursor is too long").optional(),
  })
  .strict();

export type ViewUrlQuery = z.infer<typeof viewUrlQuerySchema>;
export type UploadUrlInput = z.infer<typeof uploadUrlSchema>;
export type ConfirmUploadInput = z.infer<typeof confirmUploadSchema>;
export type MediaIdParams = z.infer<typeof mediaIdParamsSchema>;
export type ListMediaQuery = z.infer<typeof listMediaQuerySchema>;
