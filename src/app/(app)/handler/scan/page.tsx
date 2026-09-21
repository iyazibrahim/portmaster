import { requireRole } from "@/lib/session";
import { ScannerPanel } from "@/components/handler/scanner-panel";

export default async function HandlerScanPage() {
  const session = await requireRole(["HANDLER", "ADMIN"]);
  return (
    <div className="mx-auto w-full max-w-lg space-y-6 lg:max-w-xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Scanner</h1>
        <p className="text-sm text-muted-foreground">
          Camera or paste QR. Compare photo, then confirm check-in / check-out.
        </p>
      </div>
      <ScannerPanel isAdmin={session.user.role === "ADMIN"} />
    </div>
  );
}
