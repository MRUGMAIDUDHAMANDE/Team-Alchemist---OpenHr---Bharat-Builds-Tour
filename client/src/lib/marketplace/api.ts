import { apiRequest } from "@/lib/api/client";
import type { Booking, BookingPage, BookingRequest, RequestPage, RequestStatus } from "./types";

export const requestsApi = {
  create(input: { availabilityId: string; message: string }) {
    return apiRequest<{ request: BookingRequest }>("/requests", {
      method: "POST",
      body: input,
      auth: true,
    });
  },

  listMine(role: "seeker" | "publisher", status?: RequestStatus, cursor?: string) {
    const params = new URLSearchParams({ role, limit: "20" });
    if (status) params.set("status", status);
    if (cursor) params.set("cursor", cursor);
    return apiRequest<RequestPage>(`/requests/mine?${params.toString()}`, { auth: true });
  },

  accept(requestId: string) {
    return apiRequest<{ request: BookingRequest; booking: Booking }>(
      `/requests/${encodeURIComponent(requestId)}/accept`,
      { method: "POST", auth: true },
    );
  },

  reject(requestId: string) {
    return apiRequest<{ request: BookingRequest }>(
      `/requests/${encodeURIComponent(requestId)}/reject`,
      { method: "POST", auth: true },
    );
  },

  cancel(requestId: string) {
    return apiRequest<{ request: BookingRequest }>(
      `/requests/${encodeURIComponent(requestId)}/cancel`,
      { method: "POST", auth: true },
    );
  },
};

export const bookingsApi = {
  listMine(role: "seeker" | "publisher", cursor?: string) {
    const params = new URLSearchParams({ role, limit: "20" });
    if (cursor) params.set("cursor", cursor);
    return apiRequest<BookingPage>(`/bookings/mine?${params.toString()}`, { auth: true });
  },

  getOne(bookingId: string) {
    return apiRequest<{ booking: Booking }>(
      `/bookings/${encodeURIComponent(bookingId)}`,
      { auth: true },
    );
  },
};
