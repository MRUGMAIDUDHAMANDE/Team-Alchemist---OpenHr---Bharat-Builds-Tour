"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import {
  passwordRules,
  signupFormSchema,
  type SignupFormValues,
} from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/form/text-field";
import { PasswordField } from "@/components/form/password-field";
import { FormAlert } from "@/components/form/form-alert";
import { cn } from "@/lib/utils";

export function SignupForm() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const password = useWatch({ control: form.control, name: "password" });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);

    try {
      const result = await signUp(values);
      toast.success(result.message);
      router.push(`/verify?email=${encodeURIComponent(values.email)}`);
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
        label="Full name"
        autoComplete="name"
        placeholder="Rahul Sharma"
        error={form.formState.errors.name?.message}
        {...form.register("name")}
      />

      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        error={form.formState.errors.email?.message}
        {...form.register("email")}
      />

      <div className="space-y-2">
        <PasswordField
          label="Password"
          autoComplete="new-password"
          placeholder="Create a password"
          error={form.formState.errors.password?.message}
          {...form.register("password")}
        />
        <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
          {passwordRules.map((rule) => {
            const met = rule.test(password ?? "");
            return (
              <li
                key={rule.label}
                className={cn(
                  "flex items-center gap-1.5 text-xs",
                  met ? "text-success" : "text-muted-foreground",
                )}
              >
                <CheckIcon className={cn("size-3", met ? "opacity-100" : "opacity-40")} />
                {rule.label}
              </li>
            );
          })}
        </ul>
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? <Loader2Icon className="size-4 animate-spin" /> : null}
        Create account
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
