import { eq, sql } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { handlers, payments } from "@/db/schema";
import { formatMYR } from "@/lib/utils-app";
import { getTranslator } from "@/i18n";

export default async function AdminRevenuePage() {
  await requireRole(["ADMIN"]);
  const { t } = await getTranslator();

  const [paid] = await db
    .select({
      cents: sql<number>`coalesce(sum(${payments.amountCents}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(payments)
    .where(eq(payments.status, "PAID"));

  const handlerEarn = await db
    .select({
      name: handlers.displayName,
      cents: handlers.mockEarningsCents,
    })
    .from(handlers);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("admin.revenueTitle")}
        </h1>
        <p className="text-muted-foreground">{t("admin.revenueSub")}</p>
      </div>
      <div className="border-y border-border py-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Gross paid
        </p>
        <p className="text-3xl font-semibold tracking-tight">
          {formatMYR(Number(paid?.cents ?? 0))}
        </p>
        <p className="text-sm text-muted-foreground">
          {Number(paid?.count ?? 0)} paid bookings
        </p>
      </div>
      <ul className="divide-y divide-border border-y border-border">
        {handlerEarn.map((h) => (
          <li
            key={h.name}
            className="flex min-h-12 items-center justify-between py-2 text-sm"
          >
            <span>{h.name}</span>
            <span className="font-medium">{formatMYR(h.cents)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
