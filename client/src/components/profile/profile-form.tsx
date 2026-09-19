"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import type { AuthUser, AvailabilityMode } from "@/lib/auth/types";
import type { ProfileUpdateInput } from "@/lib/users/types";
import { parseCsv, profileFormSchema, type ProfileFormValues } from "@/lib/validation/profile";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/form/form-alert";
import { ModeField } from "@/components/form/mode-field";
import { TextareaField } from "@/components/form/textarea-field";
import { TextField } from "@/components/form/text-field";

function textOrNull(value: string | undefined): string | null {
  const normalized = (value ?? "").trim();
  return normalized === "" ? null : normalized;
}

function numberOrNull(value: number | "" | undefined): number | null {
  return value === "" || value === undefined ? null : value;
}

export function ProfileForm({ user }: { user: AuthUser }) {
  const router = useRouter();
  const { updateProfile } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user.name,
      bio: user.bio ?? "",
      skillsCsv: user.skills.join(", "),
      experience: user.experience ?? "",
      hourlyRate: user.hourlyRate ?? "",
      location: user.location ?? "",
      serviceRadiusKm: user.serviceRadiusKm ?? "",
      languagesCsv: user.languages.join(", "),
      preferredMode: user.preferredMode,
    },
  });

  const readOnly = user.status === "SUSPENDED" || user.status === "DISABLED";

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);

    const input: ProfileUpdateInput = {
      name: values.name.trim(),
      bio: textOrNull(values.bio),
      skills: parseCsv(values.skillsCsv ?? ""),
      experience: textOrNull(values.experience),
      hourlyRate: numberOrNull(values.hourlyRate),
      location: textOrNull(values.location),
      serviceRadiusKm: numberOrNull(values.serviceRadiusKm),
      languages: parseCsv(values.languagesCsv ?? ""),
      preferredMode: values.preferredMode,
    };

    try {
      await updateProfile(input);
      toast.success("Changes saved");
      router.push("/profile");
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Changes could not be saved. Try again.");
    }
  });

  const submitting = form.formState.isSubmitting;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {formError ? <FormAlert>{formError}</FormAlert> : null}
      {readOnly ? <FormAlert>This account cannot change its profile.</FormAlert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Full name"
          autoComplete="name"
          disabled={readOnly || submitting}
          error={form.formState.errors.name?.message}
          {...form.register("name")}
        />
        <TextField
          label="Location"
          autoComplete="address-level2"
          placeholder="Pune"
          disabled={readOnly || submitting}
          error={form.formState.errors.location?.message}
          {...form.register("location")}
        />
        <TextField
          label="Hourly rate (₹)"
          type="number"
          inputMode="numeric"
          min={1}
          placeholder="700"
          disabled={readOnly || submitting}
          error={form.formState.errors.hourlyRate?.message}
          {...form.register("hourlyRate")}
        />
        <TextField
          label="Service radius (km)"
          type="number"
          inputMode="numeric"
          min={0}
          placeholder="10"
          disabled={readOnly || submitting}
          error={form.formState.errors.serviceRadiusKm?.message}
          {...form.register("serviceRadiusKm")}
        />
      </div>

      <Controller
        control={form.control}
        name="preferredMode"
        render={({ field }) => (
          <ModeField
            id="preferredMode"
            label="Preferred mode"
            value={field.value as AvailabilityMode}
            onChange={field.onChange}
            error={form.formState.errors.preferredMode?.message}
          />
        )}
      />

      <TextareaField
        label="Bio"
        rows={4}
        placeholder="What kind of work do you do best?"
        disabled={readOnly || submitting}
        error={form.formState.errors.bio?.message}
        {...form.register("bio")}
      />

      <TextField
        label="Skills"
        placeholder="React, JavaScript, Debugging"
        hint="Separate skills with commas."
        disabled={readOnly || submitting}
        error={form.formState.errors.skillsCsv?.message}
        {...form.register("skillsCsv")}
      />

      <TextareaField
        label="Experience"
        rows={4}
        placeholder="Years of experience, notable work, or credentials."
        disabled={readOnly || submitting}
        error={form.formState.errors.experience?.message}
        {...form.register("experience")}
      />

      <TextField
        label="Languages"
        placeholder="English, Hindi, Marathi"
        hint="Separate languages with commas."
        disabled={readOnly || submitting}
        error={form.formState.errors.languagesCsv?.message}
        {...form.register("languagesCsv")}
      />

      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" disabled={readOnly || submitting}>
          {submitting ? <Loader2Icon className="size-4 animate-spin" /> : null}
          Save changes
        </Button>
        <Button type="button" variant="ghost" asChild>
          <Link href="/profile">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
