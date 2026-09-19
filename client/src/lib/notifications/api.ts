import { apiRequest } from "@/lib/api/client";

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

export const notificationsApi = {
  listMine(options: { unreadOnly?: boolean; cursor?: string } = {}) {
    const params = new URLSearchParams({ limit: "10" });
    if (options.unreadOnly) params.set("unreadOnly", "true");
    if (options.cursor) params.set("cursor", options.cursor);
    return apiRequest<{ items: NotificationItem[]; nextCursor: string | null }>(
      `/notifications/mine?${params.toString()}`,
      { auth: true },
    );
  },

  unreadCount() {
    return apiRequest<{ count: number; hasMore: boolean }>("/notifications/unread-count", {
      auth: true,
    });
  },

  markRead(notificationId: string) {
    return apiRequest<{ notification: NotificationItem }>(
      `/notifications/${encodeURIComponent(notificationId)}/read`,
      { method: "POST", auth: true },
    );
  },

  markAllRead() {
    return apiRequest<{ marked: number }>("/notifications/read-all", {
      method: "POST",
      auth: true,
    });
  },
};
