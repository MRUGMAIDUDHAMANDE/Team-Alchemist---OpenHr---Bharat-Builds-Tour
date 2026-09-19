import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AvailabilityMode } from "@/lib/auth/types";

interface ModeFieldProps {
  id: string;
  label: string;
  value: AvailabilityMode;
  onChange: (value: AvailabilityMode) => void;
  error?: string;
  hint?: string;
}

const options: Array<{ value: AvailabilityMode; label: string }> = [
  { value: "ONLINE", label: "Online" },
  { value: "IN_PERSON", label: "In person" },
  { value: "ANY", label: "Online or in person" },
];

export function ModeField({ id, label, value, onChange, error, hint }: ModeFieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={value}
        onValueChange={(next) => {
          if (next === "ONLINE" || next === "IN_PERSON" || next === "ANY") {
            onChange(next);
          }
        }}
      >
        <SelectTrigger
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className="h-9 w-full"
        >
          <SelectValue placeholder="Select a mode" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
}
