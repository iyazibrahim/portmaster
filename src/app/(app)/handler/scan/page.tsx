import { requireRole } from "@/lib/session";
import { ScannerPanel } from "@/components/handler/scanner-panel";

export default async function HandlerScanPage() {
  const session = await requireRole(["HANDLER", "ADMIN"]);
  return (
    <div className="mx-auto w-full max-w-lg space-y-6 lg:max-w-xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Scanner</h1>
        <p className="text-sm text-muted-foreground">
          Scan, confirm the angler, then the camera stays ready for the next pass.
        </p>
      </div>
      <ScannerPanel isAdmin={session.user.role === "ADMIN"} />
    </div>
  );
}
