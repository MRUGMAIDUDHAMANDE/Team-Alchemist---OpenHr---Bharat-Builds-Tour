export type NotificationType =
  | "REQUEST_CREATED"
  | "REQUEST_ACCEPTED"
  | "REQUEST_REJECTED"
  | "REQUEST_CANCELLED"
  | "BOOKING_COMPLETED"
  | "BOOKING_CANCELLED"
  | "REVIEW_CREATED";

export interface NotificationItem {
  notificationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}
