export type ContactCategory =
  | "General"
  | "Technical issue"
  | "Payment"
  | "Safety"
  | "Report user"
  | "Partnership"
  | "Other";

export type ContactStatus = "NEW" | "IN_REVIEW" | "RESOLVED";

export interface ContactMessage {
  messageId: string;
  name: string;
  email: string;
  category: ContactCategory;
  message: string;
  status: ContactStatus;
  createdAt: string;
}
