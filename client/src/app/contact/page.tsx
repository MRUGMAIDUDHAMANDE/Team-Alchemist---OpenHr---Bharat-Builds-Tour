"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2Icon, Loader2Icon } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { contactApi, type ContactCategory } from "@/lib/contact/api";
import { emailSchema, nameSchema } from "@/lib/validation/auth";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/form/form-alert";
import { TextareaField } from "@/components/form/textarea-field";
import { TextField } from "@/components/form/text-field";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const categories: ContactCategory[] = [
  "General",
  "Technical issue",
  "Payment",
  "Safety",
  "Report user",
  "Partnership",
  "Other",
];

const contactFormSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  category: z.enum(["General", "Technical issue", "Payment", "Safety", "Report user", "Partnership", "Other"]),
  message: z.string().trim().min(10, "Message must be at least 10 characters.").max(2000, "Message must be at most 2000 characters."),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

export default function ContactPage() {
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: { name: "", email: "", category: "General", message: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);

    try {
      await contactApi.submit(values);
      setSent(true);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Message could not be sent. Try again.");
    }
  });

  const submitting = form.formState.isSubmitting;

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader
        links={[
          { href: "/", label: "Home" },
          { href: "/explore", label: "Explore" },
          { href: "/contact", label: "Contact" },
        ]}
      />

      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10">
        <div className="space-y-1">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Contact us</h1>
          <p className="text-sm text-muted-foreground">
            Questions, issues, or reports — we respond within two business days.
          </p>
        </div>

        <div className="mt-6 rounded-xl bg-card p-5 ring-1 ring-foreground/10">
          {sent ? (
            <div className="space-y-3 py-6 text-center">
              <CheckCircle2Icon className="mx-auto size-8 text-success" />
              <h2 className="font-heading text-lg font-semibold">Message received</h2>
              <p className="text-sm text-muted-foreground">
                Thanks for writing in. We respond within two business days.
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate className="space-y-4">
              {formError ? <FormAlert>{formError}</FormAlert> : null}

              <TextField
                label="Name"
                autoComplete="name"
                placeholder="Your name"
                disabled={submitting}
                error={form.formState.errors.name?.message}
                {...form.register("name")}
              />

              <TextField
                label="Email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                disabled={submitting}
                error={form.formState.errors.email?.message}
                {...form.register("email")}
              />

              <Controller
                control={form.control}
                name="category"
                render={({ field }) => (
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-category">Category</Label>
                    <Select value={field.value} onValueChange={field.onChange} disabled={submitting}>
                      <SelectTrigger id="contact-category" className="h-9 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.category?.message ? (
                      <p role="alert" className="text-xs text-destructive">
                        {form.formState.errors.category.message}
                      </p>
                    ) : null}
                  </div>
                )}
              />

              <TextareaField
                label="Message"
                rows={5}
                placeholder="How can we help?"
                disabled={submitting}
                error={form.formState.errors.message?.message}
                {...form.register("message")}
              />

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Loader2Icon className="size-4 animate-spin" /> : null}
                Send message
              </Button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
