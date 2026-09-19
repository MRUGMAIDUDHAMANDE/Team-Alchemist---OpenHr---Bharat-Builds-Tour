"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { feeBreakdown, publicSettingsApi } from "@/lib/admin/api";
import { requestsApi } from "@/lib/marketplace/api";
import { formatSlotWindow } from "@/lib/availability/format";
import type { AvailabilitySlot } from "@/lib/availability/types";
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

const messageSchema = z.object({
  message: z.string().trim().min(1, "Describe what you need help with.").max(500, "Message must be at most 500 characters"),
});

type MessageValues = z.infer<typeof messageSchema>;

interface RequestDialogProps {
  slot: AvailabilitySlot | null;
  onClose: () => void;
  onSent: () => void;
}

export function RequestDialog({ slot, onClose, onSent }: RequestDialogProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const [buyerPercent, setBuyerPercent] = useState<number | null>(null);

  useEffect(() => {
    if (!slot) return;
    let active = true;

    publicSettingsApi
      .commission()
      .then(({ settings }) => {
        if (active) setBuyerPercent(settings.buyerCommissionPercent);
      })
      .catch(() => {
        if (active) setBuyerPercent(null);
      });

    return () => {
      active = false;
    };
  }, [slot]);
  const form = useForm<MessageValues>({
    resolver: zodResolver(messageSchema),
    defaultValues: { message: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    if (!slot) return;
    setFormError(null);

    try {
      await requestsApi.create({ availabilityId: slot.availabilityId, message: values.message.trim() });
      toast.success("Request sent");
      form.reset();
      onSent();
      onClose();
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Request could not be sent. Try again.");
    }
  });

  const submitting = form.formState.isSubmitting;

  const estimate =
    slot && buyerPercent !== null
      ? (() => {
          const minutes = (Date.parse(slot.endTime) - Date.parse(slot.startTime)) / 60000;
          const total = Math.round(slot.hourlyRate * (minutes / 60) * 100) / 100;
          return feeBreakdown(total, buyerPercent, 0);
        })()
      : null;

  return (
    <Dialog
      open={slot !== null}
      onOpenChange={(open) => {
        if (!open) {
          form.reset();
          setFormError(null);
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request this slot</DialogTitle>
          <DialogDescription>
            {slot ? `${slot.skills[0] ?? "Availability"} · ${formatSlotWindow(slot.startTime, slot.endTime)} · ₹${slot.hourlyRate.toLocaleString("en-IN")}/hour` : ""}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {formError ? <FormAlert>{formError}</FormAlert> : null}
          <TextareaField
            label="What do you need help with?"
            rows={4}
            placeholder="Describe the task, what is broken, and what done looks like."
            disabled={submitting}
            error={form.formState.errors.message?.message}
            {...form.register("message")}
          />
          {estimate ? (
            <p className="text-xs text-muted-foreground">
              Estimated ₹{estimate.buyerTotal.toLocaleString("en-IN")} if accepted, including a
              ₹{estimate.buyerFee.toLocaleString("en-IN")} platform fee.
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2Icon className="size-4 animate-spin" /> : null}
              Send request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
