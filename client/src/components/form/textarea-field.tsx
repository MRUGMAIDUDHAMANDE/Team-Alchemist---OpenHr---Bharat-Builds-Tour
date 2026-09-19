import { forwardRef, type ComponentProps } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface TextareaFieldProps extends ComponentProps<"textarea"> {
  label: string;
  error?: string;
  hint?: string;
}

export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  function TextareaField({ label, error, hint, id, name, className, ...props }, ref) {
    const inputId = id ?? name;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    return (
      <div className="space-y-1.5">
        <Label htmlFor={inputId}>{label}</Label>
        <Textarea
          ref={ref}
          id={inputId}
          name={name}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={cn("min-h-24", className)}
          {...props}
        />
        {hint && !error ? (
          <p id={hintId} className="text-xs text-muted-foreground">
            {hint}
          </p>
        ) : null}
        {error ? (
          <p id={errorId} role="alert" className="text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
