import { Badge } from "@/components/ui/badge";
import type { BookingStatus, RequestStatus } from "@/lib/marketplace/types";

const requestLabels: Record<RequestStatus, string> = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};

const requestVariants: Record<RequestStatus, "secondary" | "outline" | "destructive"> = {
  PENDING: "secondary",
  ACCEPTED: "outline",
  REJECTED: "destructive",
  CANCELLED: "outline",
  EXPIRED: "outline",
};

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  return <Badge variant={requestVariants[status]}>{requestLabels[status]}</Badge>;
}

const bookingLabels: Record<BookingStatus, string> = {
  CONFIRMED: "Confirmed",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const bookingVariants: Record<BookingStatus, "secondary" | "outline" | "destructive"> = {
  CONFIRMED: "secondary",
  IN_PROGRESS: "outline",
  COMPLETED: "outline",
  CANCELLED: "destructive",
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return <Badge variant={bookingVariants[status]}>{bookingLabels[status]}</Badge>;
}
