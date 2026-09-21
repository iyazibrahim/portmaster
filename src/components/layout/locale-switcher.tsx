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
    <div className="inline-flex items-center gap-1 rounded-lg border border-border/70 p-0.5 text-xs">
      <Button
        type="button"
        size="sm"
        variant={locale === "en" ? "default" : "ghost"}
        className={cn("h-7 px-2", locale === "en" && "pointer-events-none")}
        disabled={pending}
        onClick={() => startTransition(() => actionSetLocale("en"))}
      >
        EN
      </Button>
      <Button
        type="button"
        size="sm"
        variant={locale === "ms" ? "default" : "ghost"}
        className={cn("h-7 px-2", locale === "ms" && "pointer-events-none")}
        disabled={pending}
        onClick={() => startTransition(() => actionSetLocale("ms"))}
      >
        BM
      </Button>
    </div>
  );
}
