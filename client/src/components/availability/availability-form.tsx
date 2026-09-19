"use client";

import Link from "next/link";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import type { AvailabilityMode } from "@/lib/auth/types";
import type { CreateAvailabilityInput, UpdateAvailabilityInput } from "@/lib/availability/types";
import {
  availabilityFormSchema,
  combineLocalDateTime,
  type AvailabilityFormValues,
} from "@/lib/availability/form";
import { parseCsv } from "@/lib/validation/profile";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/form/form-alert";
import { ModeField } from "@/components/form/mode-field";
import { TextField } from "@/components/form/text-field";

interface AvailabilityFormProps {
  initial: AvailabilityFormValues;
  submitLabel: string;
  cancelHref: string;
  onSubmit: (input: CreateAvailabilityInput & UpdateAvailabilityInput) => Promise<void>;
  errorMessage: string;
  onSuccess: () => void;
}

export function AvailabilityForm({ initial, submitLabel, cancelHref, onSubmit, errorMessage, onSuccess }: AvailabilityFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<AvailabilityFormValues>({
    resolver: zodResolver(availabilityFormSchema),
    defaultValues: initial,
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    setFormError(null);

    const start = combineLocalDateTime(values.date, values.startTime);
    const end = combineLocalDateTime(values.date, values.endTime);
    if (!start || !end) {
      setFormError("Use a valid date, start time, and end time.");
      return;
    }
    if (values.hourlyRate === "") {
      setFormError("Enter an hourly rate.");
      return;
    }

    try {
      await onSubmit({
        skills: parseCsv(values.skillsCsv),
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        location: values.location.trim(),
        serviceRadiusKm: values.serviceRadiusKm === "" || values.serviceRadiusKm === undefined ? null : values.serviceRadiusKm,
        hourlyRate: values.hourlyRate,
        mode: values.mode,
      });
      onSuccess();
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : errorMessage);
    }
  });

  const submitting = form.formState.isSubmitting;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {formError ? <FormAlert>{formError}</FormAlert> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          label="Date"
          type="date"
          disabled={submitting}
          error={form.formState.errors.date?.message}
          {...form.register("date")}
        />
        <TextField
          label="Start time"
          type="time"
          disabled={submitting}
          error={form.formState.errors.startTime?.message}
          {...form.register("startTime")}
        />
        <TextField
          label="End time"
          type="time"
          disabled={submitting}
          error={form.formState.errors.endTime?.message}
          {...form.register("endTime")}
        />
      </div>

      <TextField
        label="Skills"
        placeholder="React, JavaScript, Debugging"
        hint="Separate skills with commas."
        disabled={submitting}
        error={form.formState.errors.skillsCsv?.message}
        {...form.register("skillsCsv")}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Location"
          placeholder="Pune"
          disabled={submitting}
          error={form.formState.errors.location?.message}
          {...form.register("location")}
        />
        <TextField
          label="Hourly rate (₹)"
          type="number"
          inputMode="numeric"
          min={1}
          placeholder="700"
          disabled={submitting}
          error={form.formState.errors.hourlyRate?.message}
          {...form.register("hourlyRate")}
        />
        <TextField
          label="Service radius (km)"
          type="number"
          inputMode="numeric"
          min={0}
          placeholder="10"
          disabled={submitting}
          error={form.formState.errors.serviceRadiusKm?.message}
          {...form.register("serviceRadiusKm")}
        />
        <Controller
          control={form.control}
          name="mode"
          render={({ field }) => (
            <ModeField
              id="availability-mode"
              label="Mode"
              value={field.value as AvailabilityMode}
              onChange={field.onChange}
              error={form.formState.errors.mode?.message}
            />
          )}
        />
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" disabled={submitting}>
          {submitting ? <Loader2Icon className="size-4 animate-spin" /> : null}
          {submitLabel}
        </Button>
        <Button type="button" variant="ghost" asChild>
          <Link href={cancelHref}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
