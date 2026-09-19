"use client";

import { useState } from "react";
import { StarIcon } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import { reviewsApi } from "@/lib/marketplace/api";
import type { Booking } from "@/lib/marketplace/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormAlert } from "@/components/form/form-alert";
import { TextareaField } from "@/components/form/textarea-field";
import { cn } from "@/lib/utils";

interface ReviewDialogProps {
  booking: Booking | null;
  onClose: () => void;
  onReviewed: () => void;
}

export function ReviewDialog({ booking, onClose, onReviewed }: ReviewDialogProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [text, setText] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const close = () => {
    setRating(0);
    setHovered(0);
    setText("");
    setFormError(null);
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!booking) return;

    if (rating < 1 || rating > 5) {
      setFormError("Select a rating from 1 to 5 stars.");
      return;
    }
    if (!text.trim()) {
      setFormError("Write a few words about the experience.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      await reviewsApi.create({ bookingId: booking.bookingId, rating, text: text.trim() });
      toast.success("Review published");
      close();
      onReviewed();
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Review could not be published. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const otherPartyName =
    booking && user
      ? booking.publisherId === user.userId
        ? booking.seekerName
        : booking.publisherName
      : null;

  return (
    <Dialog
      open={booking !== null}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Leave a review</DialogTitle>
          <DialogDescription>
            {otherPartyName ? `How was working with ${otherPartyName}?` : ""}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {formError ? <FormAlert>{formError}</FormAlert> : null}
          <div className="space-y-1.5">
            <span className="text-sm font-medium">Rating</span>
            <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  role="radio"
                  aria-checked={rating === star}
                  aria-label={`${star} star${star === 1 ? "" : "s"}`}
                  className="rounded p-0.5 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  disabled={submitting}
                >
                  <StarIcon
                    className={cn(
                      "size-6 transition-colors",
                      (hovered || rating) >= star ? "fill-amber-400 text-amber-400" : "text-muted-foreground",
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
          <TextareaField
            label="Review"
            rows={4}
            placeholder="What went well? What should others know?"
            value={text}
            onChange={(event) => setText(event.target.value)}
            disabled={submitting}
          />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={close} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              Publish review
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
