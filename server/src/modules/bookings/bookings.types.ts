export type BookingStatus = "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface Booking {
  bookingId: string;
  availabilityId: string;
  requestId: string;
  publisherId: string;
  publisherName: string;
  seekerId: string;
  seekerName: string;
  hourlyRate: number;
  startTime: string;
  endTime: string;
  totalAmount: number;
  status: BookingStatus;
  cancelReason?: string | null;
  createdAt: string;
  updatedAt: string;
}
