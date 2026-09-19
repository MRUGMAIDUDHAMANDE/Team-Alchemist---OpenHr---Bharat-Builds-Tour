import type { ReactNode } from "react";
import { AlertCircleIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function FormAlert({ children }: { children: ReactNode }) {
  return (
    <Alert variant="destructive">
      <AlertCircleIcon />
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
