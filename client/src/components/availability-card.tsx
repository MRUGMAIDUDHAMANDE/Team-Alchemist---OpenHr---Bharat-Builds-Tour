import type { ReactNode } from "react";
import { ClockIcon, MapPinIcon, WifiIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface AvailabilityCardProps {
  name: string;
  headline: string;
  location: string;
  mode: "ONLINE" | "IN_PERSON" | "ANY";
  hourlyRate: number;
  window: string;
  skills?: string[];
  status?: "AVAILABLE" | "BOOKED" | "CANCELLED" | "EXPIRED";
  footer?: ReactNode;
  className?: string;
}

const modeLabels: Record<AvailabilityCardProps["mode"], string> = {
  ONLINE: "Online",
  IN_PERSON: "In person",
  ANY: "Online or in person",
};

const statusLabels: Record<NonNullable<AvailabilityCardProps["status"]>, string> = {
  AVAILABLE: "Available",
  BOOKED: "Booked",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};

const statusVariants: Record<NonNullable<AvailabilityCardProps["status"]>, "secondary" | "outline" | "destructive"> = {
  AVAILABLE: "secondary",
  BOOKED: "outline",
  CANCELLED: "destructive",
  EXPIRED: "outline",
};

export function AvailabilityCard({
  name,
  headline,
  location,
  mode,
  hourlyRate,
  window,
  skills = [],
  status = "AVAILABLE",
  footer,
  className,
}: AvailabilityCardProps) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate text-sm font-medium">{name}</h3>
            <Badge variant={statusVariants[status]}>{statusLabels[status]}</Badge>
          </div>
          <p className="truncate text-sm text-muted-foreground">{headline}</p>
        </div>
      </div>

      <dl className="space-y-1.5 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <MapPinIcon className="size-3.5" />
          <span>{location}</span>
        </div>
        <div className="flex items-center gap-2">
          <WifiIcon className="size-3.5" />
          <span>{modeLabels[mode]}</span>
        </div>
        <div className="flex items-center gap-2">
          <ClockIcon className="size-3.5" />
          <span>{window}</span>
        </div>
      </dl>

      {skills.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {skills.map((skill) => (
            <Badge key={skill} variant="outline">
              {skill}
            </Badge>
          ))}
        </div>
      ) : null}

      {footer ? <div className="flex flex-wrap gap-2">{footer}</div> : null}

      <div className="mt-auto flex items-baseline justify-between border-t pt-3">
        <span className="text-base font-semibold">₹{hourlyRate.toLocaleString("en-IN")}</span>
        <span className="text-xs text-muted-foreground">per hour</span>
      </div>
    </article>
  );
}
