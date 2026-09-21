import { Badge } from "@/components/ui/badge";
import { formatEnumLabel } from "@/lib/utils-app";
import { cn } from "@/lib/utils";

/** Fixed-width status pill so labels align in tables and lists. */
const PILL =
  "min-w-[7.25rem] justify-center rounded-full border-transparent px-2.5 font-medium";

const PASS_TONES: Record<string, string> = {
  PENDING_PAYMENT: "bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100",
  ACTIVE: "bg-emerald-100 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100",
  CHECKED_IN: "bg-sky-100 text-sky-950 dark:bg-sky-950/40 dark:text-sky-100",
  CHECKED_OUT: "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-100",
  CANCELLED: "bg-red-100 text-red-950 dark:bg-red-950/40 dark:text-red-100",
  EXPIRED: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
  CONFIRMED: "bg-emerald-100 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100",
  COMPLETED: "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-100",
  NO_SHOW: "bg-red-100 text-red-950 dark:bg-red-950/40 dark:text-red-100",
  PAID: "bg-emerald-100 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100",
  PENDING: "bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100",
  FAILED: "bg-red-100 text-red-950 dark:bg-red-950/40 dark:text-red-100",
  REFUNDED: "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-100",
  SUSPENDED: "bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100",
  BLACKLISTED: "bg-red-100 text-red-950 dark:bg-red-950/40 dark:text-red-100",
  OPEN: "bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100",
  IN_PROGRESS: "bg-sky-100 text-sky-950 dark:bg-sky-950/40 dark:text-sky-100",
  RESOLVED: "bg-emerald-100 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100",
  AVAILABLE: "bg-emerald-100 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100",
  HERE: "bg-emerald-100 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100",
  UNAVAILABLE: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
};

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: string;
  /** Override display text (defaults to title-cased enum). */
  label?: string;
  className?: string;
}) {
  const key = status.toUpperCase().replace(/\s+/g, "_");
  const tone = PASS_TONES[key] ?? "bg-secondary text-secondary-foreground";
  return (
    <Badge
      variant="secondary"
      className={cn(PILL, tone, className)}
    >
      {label ?? formatEnumLabel(status)}
    </Badge>
  );
}
