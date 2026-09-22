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
    association_fee_cents: map.association_fee_cents ?? "500",
    reservation_minutes: map.reservation_minutes ?? "10",
    overdue_hours: map.overdue_hours ?? "8",
    default_geofence_radius_m: map.default_geofence_radius_m ?? "100",
    support_phone: map.support_phone ?? "",
    support_whatsapp: map.support_whatsapp ?? "",
    maintenance_banner_on: map.maintenance_banner_on ?? "false",
    maintenance_banner_text: map.maintenance_banner_text ?? "",
    require_jetty_geofence: map.require_jetty_geofence ?? "true",
    booking_window_copy: map.booking_window_copy ?? "",
    platform_commission_pct: map.platform_commission_pct ?? "20",
    location_side_labels: map.location_side_labels ?? "",
    default_party_size_max: map.default_party_size_max ?? "6",
    receipt_org_name: map.receipt_org_name ?? "TiangPass",
    receipt_tagline:
      map.receipt_tagline ?? "Penang Bridge fishing association pass",
    receipt_address: map.receipt_address ?? "",
    receipt_reg_no: map.receipt_reg_no ?? "",
    receipt_phone: map.receipt_phone ?? map.support_phone ?? "",
    receipt_email: map.receipt_email ?? "",
    receipt_footer:
      map.receipt_footer ??
      "Association fee · non-refundable. Show boarding QR at the jetty for check-in / check-out.",
    receipt_logo_key: map.receipt_logo_key ?? "",
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
          Pass-ops tiles are open to admins. IT integrations need a separate
          password and unlock for ~20 minutes.
        </p>
      </div>
      <SettingsPanel ops={ops} it={it} itUnlocked={itUnlocked} />
    </div>
  );
}
