import { z } from "zod";

export const createContactSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(80, "Name must be at most 80 characters"),
    email: z.string().trim().toLowerCase().email("Enter a valid email address").max(254, "Email is too long"),
    category: z.enum(["General", "Technical issue", "Payment", "Safety", "Report user", "Partnership", "Other"]),
    message: z.string().trim().min(10, "Message must be at least 10 characters").max(2000, "Message must be at most 2000 characters"),
  })
  .strict();

export type CreateContactInput = z.infer<typeof createContactSchema>;
