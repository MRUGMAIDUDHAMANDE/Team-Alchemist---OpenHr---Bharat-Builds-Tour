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
import { confirmFormSchema, type ConfirmFormValues } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/form/text-field";
import { FormAlert } from "@/components/form/form-alert";

export function ConfirmForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { confirmEmail, resendCode } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  const form = useForm<ConfirmFormValues>({
    resolver: zodResolver(confirmFormSchema),
    defaultValues: { email: searchParams.get("email") ?? "", code: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);

    try {
      await confirmEmail(values);
      toast.success("Email verified. Sign in to continue.");
      router.push(`/login?email=${encodeURIComponent(values.email)}`);
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
        return;
      }
      setFormError("Something went wrong. Try again.");
    }
  });

  const handleResend = async () => {
    const email = form.getValues("email");
    const valid = await form.trigger("email");
    if (!valid) return;

    setResending(true);
    setFormError(null);
    try {
      await resendCode(email);
      toast.success("A new code is on its way.");
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Could not resend the code.");
    } finally {
      setResending(false);
    }
  };

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
        label="Verification code"
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="123456"
        maxLength={6}
        error={form.formState.errors.code?.message}
        {...form.register("code")}
      />

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? <Loader2Icon className="size-4 animate-spin" /> : null}
        Verify email
      </Button>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50"
        >
          {resending ? "Sending..." : "Resend code"}
        </button>
        <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </div>
    </form>
  );
}
