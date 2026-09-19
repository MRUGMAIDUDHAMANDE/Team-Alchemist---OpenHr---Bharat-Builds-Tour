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
import { loginFormSchema, type LoginFormValues } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/form/text-field";
import { PasswordField } from "@/components/form/password-field";
import { FormAlert } from "@/components/form/form-alert";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    setNeedsVerification(false);

    try {
      const user = await signIn(values);
      toast.success(`Signed in as ${user.name}`);
      const next = searchParams.get("next");
      router.replace(next && next.startsWith("/") ? next : "/dashboard");
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === "USER_NOT_CONFIRMED") {
          setNeedsVerification(true);
        }
        setFormError(error.message);
        return;
      }
      setFormError("Something went wrong. Try again.");
    }
  });

  const submitting = form.formState.isSubmitting;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {formError ? (
        <FormAlert>
          {formError}
          {needsVerification ? (
            <>
              {" "}
              <Link
                href={`/verify?email=${encodeURIComponent(form.getValues("email"))}`}
                className="font-medium underline underline-offset-3"
              >
                Verify now
              </Link>
            </>
          ) : null}
        </FormAlert>
      ) : null}

      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        error={form.formState.errors.email?.message}
        {...form.register("email")}
      />

      <div className="space-y-1.5">
        <PasswordField
          label="Password"
          autoComplete="current-password"
          placeholder="Your password"
          error={form.formState.errors.password?.message}
          {...form.register("password")}
        />
        <div className="text-right">
          <Link
            href="/forgot-password"
            className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Forgot password?
          </Link>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? <Loader2Icon className="size-4 animate-spin" /> : null}
        Sign in
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        New to OpenHR?{" "}
        <Link href="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
