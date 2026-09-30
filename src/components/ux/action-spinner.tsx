import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Compact spinner for button / micro-interaction waiting states. */
export function ActionSpinner({
  className,
  label,
}: {
  className?: string;
  /** Accessible name when no visible text accompanies the spinner. */
  label?: string;
}) {
  return (
    <Loader2
      className={cn("size-4 shrink-0 animate-spin", className)}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "status" : undefined}
    />
  );
}

/** Label + spinner for busy buttons (payment, save, auth). */
export function BusyLabel({
  busy,
  busyText,
  children,
}: {
  busy: boolean;
  busyText: string;
  children: React.ReactNode;
}) {
  if (!busy) return <>{children}</>;
  return (
    <span className="inline-flex items-center justify-center gap-2">
      <ActionSpinner />
      <span>{busyText}</span>
    </span>
  );
}
