"use client";

import { useTransition } from "react";
import {
  actionResolveScanConflict,
  type actionListScanConflicts,
} from "@/lib/actions/offline";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useT } from "@/i18n/locale-provider";

type ConflictRow = Awaited<ReturnType<typeof actionListScanConflicts>>[number];

export function SyncConflictsPanel({ conflicts }: { conflicts: ConflictRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { t } = useT();

  function resolve(
    scanEventId: string,
    resolution: "keep_server" | "force_check_in" | "force_check_out",
  ) {
    startTransition(async () => {
      const res = await actionResolveScanConflict({ scanEventId, resolution });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(t("common.save"));
      router.refresh();
    });
  }

  if (conflicts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("admin.noConflicts")}</p>
    );
  }

  return (
    <div className="space-y-3">
      {conflicts.map((c) => (
        <div key={c.id} className="rounded-lg border p-4 text-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-medium">
                {c.reference ?? c.passId ?? c.id}
              </p>
              <p className="text-xs text-muted-foreground">
                {c.type.replaceAll("_", " ")} ·{" "}
                {new Date(c.scannedAt).toLocaleString()}
              </p>
            </div>
            {c.passStatus ? <StatusBadge status={c.passStatus} /> : null}
          </div>
          {c.note ? (
            <p className="mt-2 text-xs text-muted-foreground">{c.note}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => resolve(c.id, "keep_server")}
            >
              {t("admin.keepServer")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => resolve(c.id, "force_check_in")}
            >
              {t("admin.forceIn")}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() => resolve(c.id, "force_check_out")}
            >
              {t("admin.forceOut")}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
