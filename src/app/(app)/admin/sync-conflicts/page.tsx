import { requireRole } from "@/lib/session";
import { actionListScanConflicts } from "@/lib/actions/offline";
import { SyncConflictsPanel } from "@/components/admin/sync-conflicts-panel";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function AdminSyncConflictsPage() {
  await requireRole(["ADMIN"]);
  const conflicts = await actionListScanConflicts();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Offline sync conflicts
          </h1>
          <p className="text-sm text-muted-foreground">
            Review CI/CO events that could not apply cleanly after jetty devices
            came back online.
          </p>
        </div>
        <Link
          href="/admin/alerts"
          className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}
        >
          Alerts &amp; incidents
        </Link>
      </div>
      <SyncConflictsPanel conflicts={conflicts} />
    </div>
  );
}
