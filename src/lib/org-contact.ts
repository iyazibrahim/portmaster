import { db } from "@/db";
import { settings } from "@/db/schema";

export type OrgContact = {
  name: string;
  email: string | null;
  phone: string | null;
};

function isPlaceholderEmail(email: string) {
  const lower = email.toLowerCase();
  return lower.endsWith(".local") || lower.includes("example.com");
}

/** Public contact details from Admin settings (no demo placeholders). */
export async function getOrgContact(): Promise<OrgContact> {
  const rows = await db.select().from(settings);
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<
    string,
    string
  >;
  const name = map.receipt_org_name?.trim() || "TiangPass";
  const rawEmail = map.receipt_email?.trim() || map.support_email?.trim() || "";
  const phone = map.receipt_phone?.trim() || null;
  const email =
    rawEmail && !isPlaceholderEmail(rawEmail) ? rawEmail : null;
  return { name, email, phone };
}
