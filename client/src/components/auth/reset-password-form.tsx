"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import {
  resetPasswordFormSchema,
  type ResetPasswordFormValues,
} from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/form/text-field";
import { PasswordField } from "@/components/form/password-field";
import { FormAlert } from "@/components/form/form-alert";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resetPassword } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: {
      email: searchParams.get("email") ?? "",
      code: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);

    try {
      await resetPassword({
        email: values.email,
        code: values.code,
        newPassword: values.newPassword,
      });
      toast.success("Password updated. Sign in with your new password.");
      router.push("/login");
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
        return;
      }
      setFormError("Something went wrong. Try again.");
    }
  });

  const submitting = form.formState.isSubmitting;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {formError ? <FormAlert>{formError}</FormAlert> : null}

      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        error={form.formState.errors.email?.message}
        {...form.register("email")}
      />

      <TextField
        label="Reset code"
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="123456"
        maxLength={6}
        error={form.formState.errors.code?.message}
        {...form.register("code")}
      />

      <PasswordField
        label="New password"
        autoComplete="new-password"
        placeholder="New password"
        error={form.formState.errors.newPassword?.message}
        {...form.register("newPassword")}
      />

      <PasswordField
        label="Confirm password"
        autoComplete="new-password"
        placeholder="Repeat new password"
        error={form.formState.errors.confirmPassword?.message}
        {...form.register("confirmPassword")}
      />

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? <Loader2Icon className="size-4 animate-spin" /> : null}
        Update password
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
