import { Badge } from "@/components/ui/badge";
import { formatEnumLabel } from "@/lib/utils-app";
import { cn } from "@/lib/utils";

/** Fixed-width status pill so labels align in tables and lists. */
const PILL =
  "min-w-[7.25rem] justify-center rounded-full border-transparent px-2.5 font-medium";

const GREEN =
  "bg-emerald-100 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100";
const AMBER =
  "bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100";
const RED = "bg-red-100 text-red-950 dark:bg-red-950/40 dark:text-red-100";
const SKY = "bg-sky-100 text-sky-950 dark:bg-sky-950/40 dark:text-sky-100";
const ZINC = "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200";
const SLATE =
  "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-100";

const PASS_TONES: Record<string, string> = {
  PENDING_PAYMENT: AMBER,
  ACTIVE: GREEN,
  CHECKED_IN: SKY,
  CHECKED_OUT: SLATE,
  CANCELLED: RED,
  EXPIRED: ZINC,
  CONFIRMED: GREEN,
  COMPLETED: SLATE,
  NO_SHOW: RED,
  PAID: GREEN,
  PENDING: AMBER,
  FAILED: RED,
  REFUNDED: SLATE,
  SUSPENDED: AMBER,
  BLACKLISTED: RED,
  OPEN: AMBER,
  IN_PROGRESS: SKY,
  RESOLVED: GREEN,
  AVAILABLE: GREEN,
  HERE: GREEN,
  UNAVAILABLE: RED,
  TEMPORARILY_CLOSED: AMBER,
  UNDER_MAINTENANCE: AMBER,
  RESTRICTED: AMBER,
  INACTIVE: RED,
  PERMIT_EXPIRED: RED,
  INFO: SKY,
  WARNING: AMBER,
  CRITICAL: RED,
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
    <Badge variant="secondary" className={cn(PILL, tone, className)}>
      {label ?? formatEnumLabel(status)}
    </Badge>
  );
}
