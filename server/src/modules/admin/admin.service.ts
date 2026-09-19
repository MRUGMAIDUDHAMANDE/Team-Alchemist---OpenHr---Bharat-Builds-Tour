import { AppError } from "../../lib/errors";
import { decodePageCursor, encodePageCursor } from "../availability/availability.pagination";
import { computeFees } from "../settings/commission";
import type { availabilityRepository } from "../availability/availability.repository";
import type { bookingsRepository } from "../bookings/bookings.repository";
import type { contactRepository } from "../contact/contact.repository";
import type { settingsRepository } from "../settings/settings.repository";
import type { usersRepository } from "../users/users.repository";
import { toPrivateProfile, type PrivateUserProfile } from "../users/users.types";
import type { Booking } from "../bookings/bookings.types";
import type { ContactMessage, ContactStatus } from "../contact/contact.types";
import type { reportsRepository } from "../reports/reports.repository";
import type { LeakageReport, ReportStatus } from "../reports/reports.types";

export type AdminUserStore = Pick<typeof usersRepository, "list" | "getById" | "setStatus">;
export type AdminAvailabilityStore = Pick<typeof availabilityRepository, "listAll">;
export type AdminBookingStore = Pick<typeof bookingsRepository, "listAll">;
export type AdminContactStore = Pick<typeof contactRepository, "list" | "getById" | "setStatus">;
export type AdminReportStore = Pick<typeof reportsRepository, "getById" | "listByStatus" | "setStatus">;
export type AdminSettingsStore = Pick<typeof settingsRepository, "getPlatform">;

export interface AdminOverview {
  users: { total: number; active: number; suspended: number };
  availability: { available: number; booked: number; cancelled: number };
  bookings: { confirmed: number; inProgress: number; completed: number; cancelled: number };
  platformRevenue: number;
  contactNew: number;
}

export const adminService = {
  async getOverview(
    users: AdminUserStore,
    availability: AdminAvailabilityStore,
    bookings: AdminBookingStore,
    contact: AdminContactStore,
    settings: AdminSettingsStore,
  ): Promise<AdminOverview> {
    const [profiles, slots, allBookings, messages, platform] = await Promise.all([
      users.list(),
      availability.listAll(500),
      bookings.listAll(500),
      contact.list(500),
      settings.getPlatform(),
    ]);

    const revenue = allBookings
      .filter((booking) => booking.status !== "CANCELLED")
      .reduce(
        (sum, booking) =>
          sum + computeFees(booking.totalAmount, platform.buyerCommissionPercent, platform.sellerCommissionPercent).platformRevenue,
        0,
      );

    const countBy = <T extends string>(items: Array<{ status: T }>) => {
      const counts = {} as Record<T, number>;
      for (const item of items) counts[item.status] = (counts[item.status] ?? 0) + 1;
      return counts;
    };

    const slotCounts = countBy(slots);
    const bookingCounts = countBy(allBookings);

    return {
      users: {
        total: profiles.length,
        active: profiles.filter((profile) => profile.status === "ACTIVE").length,
        suspended: profiles.filter((profile) => profile.status === "SUSPENDED" || profile.status === "DISABLED").length,
      },
      availability: {
        available: slotCounts.AVAILABLE ?? 0,
        booked: slotCounts.BOOKED ?? 0,
        cancelled: slotCounts.CANCELLED ?? 0,
      },
      bookings: {
        confirmed: bookingCounts.CONFIRMED ?? 0,
        inProgress: bookingCounts.IN_PROGRESS ?? 0,
        completed: bookingCounts.COMPLETED ?? 0,
        cancelled: bookingCounts.CANCELLED ?? 0,
      },
      platformRevenue: Math.round(revenue * 100) / 100,
      contactNew: messages.filter((message) => message.status === "NEW").length,
    };
  },

  async listUsers(store: AdminUserStore): Promise<PrivateUserProfile[]> {
    const profiles = await store.list();
    return profiles.map(toPrivateProfile);
  },

  async listBookings(store: AdminBookingStore): Promise<Booking[]> {
    const bookings = await store.listAll(100);
    return bookings.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },

  async listContact(store: AdminContactStore): Promise<ContactMessage[]> {
    return store.list(100);
  },

  async resolveContact(messageId: string, status: ContactStatus, store: AdminContactStore): Promise<ContactMessage> {
    const message = await store.getById(messageId);
    if (!message) {
      throw AppError.notFound("Message not found");
    }
    return store.setStatus(messageId, status);
  },

  async listReports(status: ReportStatus | undefined, limit: number, cursor: string | undefined, store: AdminReportStore): Promise<{ items: LeakageReport[]; nextCursor: string | null }> {
    const result = await store.listByStatus(status, limit, decodePageCursor(cursor));
    return { items: result.items, nextCursor: encodePageCursor(result.lastKey) };
  },

  async resolveReport(reportId: string, status: ReportStatus, store: AdminReportStore): Promise<LeakageReport> {
    const report = await store.getById(reportId);
    if (!report) {
      throw AppError.notFound("Report not found");
    }
    return store.setStatus(reportId, status);
  },
};
