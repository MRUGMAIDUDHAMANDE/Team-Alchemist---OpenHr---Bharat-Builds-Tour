import { apiRequest } from "@/lib/api/client";

export interface AdminOverview {
  users: { total: number; active: number; suspended: number };
  availability: { available: number; booked: number; cancelled: number };
  bookings: { confirmed: number; inProgress: number; completed: number; cancelled: number };
  platformRevenue: number;
  contactNew: number;
}

export interface AdminUser {
  userId: string;
  email: string;
  name: string;
  role: "USER" | "ADMIN";
  status: "UNCONFIRMED" | "ACTIVE" | "SUSPENDED" | "DISABLED";
  createdAt: string;
}

export interface AdminBooking {
  bookingId: string;
  publisherId: string;
  seekerId: string;
  publisherName: string;
  seekerName: string;
  hourlyRate: number;
  totalAmount: number;
  status: string;
  createdAt: string;
}

export interface ContactMessage {
  messageId: string;
  name: string;
  email: string;
  category: string;
  message: string;
  status: "NEW" | "IN_REVIEW" | "RESOLVED";
  createdAt: string;
}

export interface LeakageReport {
  reportId: string;
  sourceType: "REQUEST_MESSAGE" | "REVIEW_TEXT";
  sourceId: string;
  authorId: string;
  findings: Array<{ type: string; count: number }>;
  excerpt: string;
  status: "OPEN" | "REVIEWED" | "DISMISSED";
  createdAt: string;
}

export interface PlatformSettings {
  buyerCommissionPercent: number;
  sellerCommissionPercent: number;
  updatedAt: string;
}

export const adminApi = {
  overview() {
    return apiRequest<AdminOverview>("/admin/overview", { auth: true });
  },

  users() {
    return apiRequest<{ users: AdminUser[] }>("/admin/users", { auth: true });
  },

  setUserStatus(userId: string, status: "ACTIVE" | "SUSPENDED" | "DISABLED") {
    return apiRequest<{ userId: string; status: string }>(`/admin/users/${encodeURIComponent(userId)}/status`, {
      method: "PATCH",
      body: { status },
      auth: true,
    });
  },

  bookings() {
    return apiRequest<{ bookings: AdminBooking[] }>("/admin/bookings", { auth: true });
  },

  contact() {
    return apiRequest<{ messages: ContactMessage[] }>("/admin/contact", { auth: true });
  },

  resolveContact(messageId: string, status: "NEW" | "IN_REVIEW" | "RESOLVED") {
    return apiRequest<{ message: ContactMessage }>(`/admin/contact/${encodeURIComponent(messageId)}/status`, {
      method: "PATCH",
      body: { status },
      auth: true,
    });
  },

  reports(status?: "OPEN" | "REVIEWED" | "DISMISSED") {
    const params = new URLSearchParams({ limit: "20" });
    if (status) params.set("status", status);
    return apiRequest<{ items: LeakageReport[]; nextCursor: string | null }>(
      `/admin/reports?${params.toString()}`,
      { auth: true },
    );
  },

  resolveReport(reportId: string, status: "REVIEWED" | "DISMISSED") {
    return apiRequest<{ report: LeakageReport }>(`/admin/reports/${encodeURIComponent(reportId)}/status`, {
      method: "PATCH",
      body: { status },
      auth: true,
    });
  },

  settings() {
    return apiRequest<{ settings: PlatformSettings }>("/settings", { auth: true });
  },

  updateSettings(input: { buyerCommissionPercent?: number; sellerCommissionPercent?: number }) {
    return apiRequest<{ settings: PlatformSettings }>("/settings", {
      method: "PUT",
      body: input,
      auth: true,
    });
  },
};

export const publicSettingsApi = {
  commission() {
    return apiRequest<{ settings: { buyerCommissionPercent: number; sellerCommissionPercent: number } }>(
      "/settings/public",
    );
  },
};

export function feeBreakdown(totalAmount: number, buyerPercent: number, sellerPercent: number) {
  const round2 = (value: number) => Math.round(value * 100) / 100;
  const buyerFee = round2((totalAmount * buyerPercent) / 100);
  const sellerFee = round2((totalAmount * sellerPercent) / 100);
  return {
    buyerFee,
    buyerTotal: round2(totalAmount + buyerFee),
    sellerFee,
    sellerPayout: round2(totalAmount - sellerFee),
    platformRevenue: round2(buyerFee + sellerFee),
  };
}
