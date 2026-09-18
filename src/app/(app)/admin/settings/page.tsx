import {
  getSettingsMap,
  isItSettingsUnlocked,
} from "@/lib/actions/admin";
import { requireRole } from "@/lib/session";
import { SettingsPanel } from "@/components/admin/settings-panel";

export default async function AdminSettingsPage() {
  await requireRole(["ADMIN"]);
  const map = await getSettingsMap();
  const itUnlocked = await isItSettingsUnlocked();

  const ops = {
    support_phone: map.support_phone ?? "",
    support_whatsapp: map.support_whatsapp ?? "",
    booking_window_copy: map.booking_window_copy ?? "",
    platform_commission_pct: map.platform_commission_pct ?? "20",
    location_side_labels: map.location_side_labels ?? "",
    default_party_size_max: map.default_party_size_max ?? "6",
    maintenance_banner_on: map.maintenance_banner_on ?? "false",
    maintenance_banner_text: map.maintenance_banner_text ?? "",
  };

  const it = {
    qr_token_ttl_hours: map.qr_token_ttl_hours ?? "48",
    payment_gateway_api_url: map.payment_gateway_api_url ?? "",
    payment_gateway_key: map.payment_gateway_key ?? "",
    smtp_host: map.smtp_host ?? "",
    smtp_user: map.smtp_user ?? "",
    smtp_pass: map.smtp_pass ?? "",
    webhook_secret: map.webhook_secret ?? "",
    app_url_override: map.app_url_override ?? "",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Ops settings are open to admins. IT settings need a separate password
          and unlock for ~20 minutes.
        </p>
      </div>
      <SettingsPanel ops={ops} it={it} itUnlocked={itUnlocked} />
    </div>
  );
}
