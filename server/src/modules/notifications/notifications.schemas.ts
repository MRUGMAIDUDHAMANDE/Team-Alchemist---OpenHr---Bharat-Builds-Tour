import { z } from "zod";

export const notificationIdParamsSchema = z
  .object({
    notificationId: z.string().trim().min(1, "Notification ID is required").max(128, "Notification ID is too long"),
  })
  .strict();

export const listNotificationsQuerySchema = z
  .object({
    limit: z.coerce.number().int("Limit must be a whole number").min(1, "Limit must be at least 1").max(50, "Limit must be at most 50").default(20),
    cursor: z.string().trim().min(1, "Cursor must not be blank").max(4096, "Cursor is too long").optional(),
    unreadOnly: z.preprocess(
      (value) => value === "true" || value === true,
      z.boolean().optional(),
    ),
  })
  .strict();

export type NotificationIdParams = z.infer<typeof notificationIdParamsSchema>;
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
