export type RequestStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED" | "EXPIRED";

export interface BookingRequest {
  requestId: string;
  availabilityId: string;
  publisherId: string;
  seekerId: string;
  seekerName: string;
  message: string;
  skills: string[];
  startTime: string;
  endTime: string;
  location: string;
  hourlyRate: number;
  mode: "ONLINE" | "IN_PERSON" | "ANY";
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
}

export interface RequestPage {
  items: BookingRequest[];
  nextCursor: string | null;
}

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
  createdAt: string;
  updatedAt: string;
}

export interface BookingPage {
  items: Booking[];
  nextCursor: string | null;
}

export interface Review {
  reviewId: string;
  bookingId: string;
  reviewerId: string;
  reviewerName: string;
  revieweeId: string;
  rating: number;
  text: string;
  createdAt: string;
}
