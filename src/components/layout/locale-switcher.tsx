"use client";

import { useTransition } from "react";
import { actionSetLocale } from "@/lib/actions/locale";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LocaleSwitcher({
  locale,
}: {
  locale: "en" | "ms";
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="inline-flex items-center gap-1 rounded-[10px] border border-border/70 p-[4px] text-xs">
      <Button
        type="button"
        size="xs"
        variant={locale === "en" ? "default" : "ghost"}
        className={cn(
          "h-6 min-h-6 min-w-6 rounded-[10px] px-1.5 text-xs",
          locale === "en" && "pointer-events-none",
        )}
        disabled={pending}
        onClick={() => startTransition(() => actionSetLocale("en"))}
      >
        EN
      </Button>
      <Button
        type="button"
        size="xs"
        variant={locale === "ms" ? "default" : "ghost"}
        className={cn(
          "h-6 min-h-6 min-w-6 rounded-[10px] px-1.5 text-xs",
          locale === "ms" && "pointer-events-none",
        )}
        disabled={pending}
        onClick={() => startTransition(() => actionSetLocale("ms"))}
      >
        BM
      </Button>
    </div>
  );
}
