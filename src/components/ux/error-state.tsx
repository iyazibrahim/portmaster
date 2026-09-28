"use client";

import type { LucideIcon } from "lucide-react";
import { AlertCircle, WifiOff } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ErrorState({
  icon: Icon,
  title,
  description,
  actionHint,
  retryLabel,
  onRetry,
  alternativeLabel,
  alternativeHref,
  className,
  offline,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionHint?: string;
  retryLabel: string;
  onRetry?: () => void;
  alternativeLabel?: string;
  alternativeHref?: string;
  className?: string;
  offline?: boolean;
}) {
  const Glyph = Icon ?? (offline ? WifiOff : AlertCircle);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-xl border border-destructive/20 bg-card px-4 py-8 text-center",
        className,
      )}
      role="alert"
    >
      <Glyph
        className="size-6 text-destructive"
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
        {actionHint ? (
          <p className="text-sm leading-normal text-muted-foreground">
            {actionHint}
          </p>
        ) : null}
      </div>
      <div className="flex w-full max-w-sm flex-col gap-2 sm:flex-row sm:justify-center">
        {onRetry ? (
          <Button type="button" className="w-full sm:w-auto" onClick={onRetry}>
            {retryLabel}
          </Button>
        ) : null}
        {alternativeLabel && alternativeHref ? (
          <Button
            render={<Link href={alternativeHref} />}
            variant="outline"
            className="w-full sm:w-auto"
          >
            {alternativeLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
