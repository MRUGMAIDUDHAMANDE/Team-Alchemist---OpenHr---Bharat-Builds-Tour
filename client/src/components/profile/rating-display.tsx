import { StarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingDisplayProps {
  value: number;
  count: number;
  showCount?: boolean;
  className?: string;
}

export function RatingDisplay({ value, count, showCount = true, className }: RatingDisplayProps) {
  const rounded = Math.max(0, Math.min(5, Math.round(value)));

  return (
    <span
      role="img"
      aria-label={count > 0 ? `Rated ${value.toFixed(1)} out of 5 from ${count} reviews` : "No ratings yet"}
      className={cn("inline-flex items-center gap-1 text-sm", className)}
    >
      <span className="inline-flex items-center gap-0.5" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIcon
            key={star}
            className={cn("size-3.5", star <= rounded ? "fill-amber-400 text-amber-400" : "text-muted-foreground")}
          />
        ))}
      </span>
      {showCount ? (
        <span className="text-muted-foreground">{count > 0 ? `${value.toFixed(1)} (${count})` : "No ratings yet"}</span>
      ) : null}
    </span>
  );
}
