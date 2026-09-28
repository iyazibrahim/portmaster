"use client";

import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-xl border border-border/80 bg-card px-4 py-8 text-center",
        className,
      )}
      role="status"
    >
      <Icon
        className="size-6 text-muted-foreground"
        strokeWidth={2}
        aria-hidden
      />
      <div className="flex max-w-sm flex-col gap-2">
        <p className="text-base font-semibold tracking-tight">{title}</p>
        {description ? (
          <p className="text-sm leading-normal text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actionLabel && actionHref ? (
        <Button render={<Link href={actionHref} />}>{actionLabel}</Button>
      ) : null}
      {actionLabel && onAction && !actionHref ? (
        <Button type="button" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
