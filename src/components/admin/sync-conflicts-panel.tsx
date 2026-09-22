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

type ConflictRow = Awaited<ReturnType<typeof actionListScanConflicts>>[number];

export function SyncConflictsPanel({ conflicts }: { conflicts: ConflictRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

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
      toast.success("Conflict resolved");
      router.refresh();
    });
  }

  if (conflicts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No open sync conflicts. Offline scans that cannot apply cleanly appear
        here.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {conflicts.map((c) => (
        <div
          key={c.id}
          className="rounded-lg border p-4 text-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-medium">{c.reference ?? c.passId ?? c.id}</p>
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
              Keep server status
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => resolve(c.id, "force_check_in")}
            >
              Force checked-in
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() => resolve(c.id, "force_check_out")}
            >
              Force checked-out
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
