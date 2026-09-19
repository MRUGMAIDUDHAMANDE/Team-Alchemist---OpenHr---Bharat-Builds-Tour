"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { adminApi } from "@/lib/admin/api";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/form/form-alert";
import { TextField } from "@/components/form/text-field";
import { Skeleton } from "@/components/ui/skeleton";

const settingsFormSchema = z.object({
  buyerCommissionPercent: z.coerce.number().min(0, "Cannot be negative.").max(50, "Must be at most 50%."),
  sellerCommissionPercent: z.coerce.number().min(0, "Cannot be negative.").max(50, "Must be at most 50%."),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export default function AdminCommissionPage() {
  const [formError, setFormError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: { buyerCommissionPercent: 5, sellerCommissionPercent: 10 },
  });

  useEffect(() => {
    let active = true;

    adminApi
      .settings()
      .then(({ settings }) => {
        if (!active) return;
        form.reset({
          buyerCommissionPercent: settings.buyerCommissionPercent,
          sellerCommissionPercent: settings.sellerCommissionPercent,
        });
        setReady(true);
      })
      .catch((fetchError) => {
        if (active) {
          setFormError(fetchError instanceof ApiError ? fetchError.message : "Settings could not be loaded. Try again.");
          setReady(true);
        }
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);

    try {
      const { settings } = await adminApi.updateSettings(values);
      form.reset({
        buyerCommissionPercent: settings.buyerCommissionPercent,
        sellerCommissionPercent: settings.sellerCommissionPercent,
      });
      toast.success("Commission saved");
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Settings could not be saved. Try again.");
    }
  });

  const submitting = form.formState.isSubmitting;

  if (!ready) {
    return (
      <div className="max-w-md space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-md space-y-4">
      <p className="text-sm text-muted-foreground">
        Percentages apply to every new booking total. Buyer fees add to what seekers pay; seller fees deduct from publisher payouts.
      </p>
      {formError ? <FormAlert>{formError}</FormAlert> : null}
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <TextField
          label="Buyer commission (%)"
          type="number"
          inputMode="decimal"
          min={0}
          max={50}
          step="0.5"
          disabled={submitting}
          error={form.formState.errors.buyerCommissionPercent?.message}
          {...form.register("buyerCommissionPercent")}
        />
        <TextField
          label="Seller commission (%)"
          type="number"
          inputMode="decimal"
          min={0}
          max={50}
          step="0.5"
          disabled={submitting}
          error={form.formState.errors.sellerCommissionPercent?.message}
          {...form.register("sellerCommissionPercent")}
        />
        <Button type="submit" disabled={submitting}>
          {submitting ? <Loader2Icon className="size-4 animate-spin" /> : null}
          Save changes
        </Button>
      </form>
    </div>
  );
}
