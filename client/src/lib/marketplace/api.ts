import { apiRequest } from "@/lib/api/client";
import type { Booking, BookingPage, BookingRequest, RequestPage, RequestStatus, Review } from "./types";

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

export const reviewsApi = {
  create(input: { bookingId: string; rating: number; text: string }) {
    return apiRequest<{ review: Review }>("/reviews", {
      method: "POST",
      body: input,
      auth: true,
    });
  },

  listByReviewee(revieweeId: string) {
    const params = new URLSearchParams({ revieweeId, limit: "10" });
    return apiRequest<{ items: Review[]; nextCursor: string | null }>(
      `/reviews?${params.toString()}`,
      { auth: true },
    );
  },

  listByBooking(bookingId: string) {
    const params = new URLSearchParams({ bookingId });
    return apiRequest<{ items: Review[]; nextCursor: string | null }>(
      `/reviews?${params.toString()}`,
      { auth: true },
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

  start(bookingId: string) {
    return apiRequest<{ booking: Booking }>(
      `/bookings/${encodeURIComponent(bookingId)}/start`,
      { method: "POST", auth: true },
    );
  },

  complete(bookingId: string) {
    return apiRequest<{ booking: Booking }>(
      `/bookings/${encodeURIComponent(bookingId)}/complete`,
      { method: "POST", auth: true },
    );
  },

  cancel(bookingId: string, reason?: string) {
    return apiRequest<{ booking: Booking }>(
      `/bookings/${encodeURIComponent(bookingId)}/cancel`,
      { method: "POST", body: reason ? { reason } : {}, auth: true },
    );
  },
};
