import { requireRole } from "@/lib/session";
import { ScannerPanel } from "@/components/handler/scanner-panel";
import { isJettyGeofenceRequired } from "@/lib/pass";
import { getTranslator } from "@/i18n";

export default async function HandlerScanPage() {
  const session = await requireRole(["HANDLER", "ADMIN"]);
  const requireJettyGps = await isJettyGeofenceRequired();
  const { t } = await getTranslator();
  return (
    <div className="mx-auto w-full max-w-lg space-y-6 lg:max-w-xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("scan.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("scan.subtitle")}</p>
      </div>
      <ScannerPanel
        isAdmin={session.user.role === "ADMIN"}
        requireJettyGps={requireJettyGps}
      />
    </div>
  );
}
