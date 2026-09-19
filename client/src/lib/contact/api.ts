import { apiRequest } from "@/lib/api/client";

export type ContactCategory =
  | "General"
  | "Technical issue"
  | "Payment"
  | "Safety"
  | "Report user"
  | "Partnership"
  | "Other";

export const contactApi = {
  submit(input: { name: string; email: string; category: ContactCategory; message: string }) {
    return apiRequest<{ message: string; messageId: string }>("/contact", {
      method: "POST",
      body: input,
    });
  },
};
