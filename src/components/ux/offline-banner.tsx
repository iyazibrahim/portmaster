"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";

export function OfflineBanner({ className }: { className?: string }) {
  const { t } = useT();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    function sync() {
      setOffline(!navigator.onLine);
    }
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 border-b border-border bg-muted px-4 py-2 text-sm",
        className,
      )}
      role="status"
    >
      <p className="flex min-w-0 items-center gap-2 text-muted-foreground">
        <WifiOff className="size-4 shrink-0" strokeWidth={2} aria-hidden />
        <span className="truncate">{t("ux.offline.banner")}</span>
      </p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="min-h-11 shrink-0"
        onClick={() => window.location.reload()}
      >
        {t("common.retry")}
      </Button>
    </div>
  );
}
