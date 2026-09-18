import { requireRole } from "@/lib/session";
import { ScannerPanel } from "@/components/handler/scanner-panel";

export default async function HandlerScanPage() {
  await requireRole(["HANDLER", "ADMIN"]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Scanner</h1>
        <p className="text-muted-foreground">
          Validate opaque boarding tokens for check-in and check-out.
        </p>
      </div>
      <ScannerPanel />
    </div>
  );
}
