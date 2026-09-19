import { z } from "zod";

const percentSchema = (field: string) =>
  z.number({ invalid_type_error: `${field} must be a number` }).min(0, `${field} cannot be negative`).max(50, `${field} must be at most 50%`);

export const updateSettingsSchema = z
  .object({
    buyerCommissionPercent: percentSchema("Buyer commission").optional(),
    sellerCommissionPercent: percentSchema("Seller commission").optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one setting to update.",
  });

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
