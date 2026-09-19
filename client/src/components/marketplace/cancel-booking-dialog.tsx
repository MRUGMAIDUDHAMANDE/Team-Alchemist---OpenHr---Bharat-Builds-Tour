"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TextareaField } from "@/components/form/textarea-field";
import type { Booking } from "@/lib/marketplace/types";

interface CancelBookingDialogProps {
  booking: Booking | null;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
}

export function CancelBookingDialog({ booking, onClose, onConfirm }: CancelBookingDialogProps) {
  const [reason, setReason] = useState("");

  const close = () => {
    setReason("");
    onClose();
  };

  return (
    <Dialog
      open={booking !== null}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel this booking?</DialogTitle>
          <DialogDescription>
            The other party keeps a record of the cancellation. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <TextareaField
          label="Reason (optional)"
          rows={3}
          placeholder="Why are you cancelling?"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={close}>
            Keep booking
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              onConfirm(reason.trim() ? reason.trim() : undefined);
              close();
            }}
          >
            Cancel booking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
