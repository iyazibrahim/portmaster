import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { jetties, locations, passes, payments, users } from "@/db/schema";
import { PaymentsTable } from "@/components/admin/payments-table";
import { formatMYR, todayMYT } from "@/lib/utils-app";
import { getTranslator } from "@/i18n";

function methodLabel(provider: string) {
  if (!provider || provider === "mock") return "Mock";
  return provider.charAt(0).toUpperCase() + provider.slice(1).toLowerCase();
}

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ jetty?: string }>;
}) {
  await requireRole(["ADMIN"]);
  const { t } = await getTranslator();
  const { jetty: jettyParam } = await searchParams;

  const jettyOptions = await db
    .select({ id: jetties.id, name: jetties.name })
    .from(jetties)
    .where(eq(jetties.active, true))
    .orderBy(asc(jetties.sortOrder), asc(jetties.name));

  const jettyId =
    jettyParam && jettyParam !== "all"
      ? jettyOptions.find((j) => j.id === jettyParam)?.id
      : undefined;

  const jettyClause = jettyId ? eq(passes.jettyId, jettyId) : sql`true`;
  const today = todayMYT();

  const rows = await db
    .select({
      id: payments.id,
      amountCents: payments.amountCents,
      status: payments.status,
      provider: payments.provider,
      mockRef: payments.mockRef,
      paidAt: payments.paidAt,
      createdAt: payments.createdAt,
      reference: passes.reference,
      angler: users.name,
      jettyName: jetties.name,
      pillarName: locations.name,
    })
    .from(payments)
    .innerJoin(passes, eq(payments.passId, passes.id))
    .innerJoin(users, eq(passes.userId, users.id))
    .innerJoin(locations, eq(passes.pillarId, locations.id))
    .innerJoin(jetties, eq(passes.jettyId, jetties.id))
    .where(jettyClause)
    .orderBy(desc(payments.createdAt))
    .limit(200);

  const monthStart = `${today.slice(0, 7)}-01`;

  const [monthCollected] = await db
    .select({
      cents: sql<number>`coalesce(sum(${payments.amountCents}), 0)`,
    })
    .from(payments)
    .innerJoin(passes, eq(payments.passId, passes.id))
    .where(
      and(
        eq(payments.status, "PAID"),
        gte(payments.paidAt, new Date(`${monthStart}T00:00:00+08:00`)),
        jettyClause,
      ),
    );

  const [todayCollected] = await db
    .select({
      cents: sql<number>`coalesce(sum(${payments.amountCents}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(payments)
    .innerJoin(passes, eq(payments.passId, passes.id))
    .where(
      and(
        eq(payments.status, "PAID"),
        gte(payments.paidAt, new Date(`${today}T00:00:00+08:00`)),
        lte(payments.paidAt, new Date(`${today}T23:59:59.999+08:00`)),
        jettyClause,
      ),
    );

  const [statusCounts] = await db
    .select({
      paid: sql<number>`coalesce(sum(case when ${payments.status} = 'PAID' then 1 else 0 end), 0)`,
      pending: sql<number>`coalesce(sum(case when ${payments.status} = 'PENDING' then 1 else 0 end), 0)`,
      failed: sql<number>`coalesce(sum(case when ${payments.status} = 'FAILED' then 1 else 0 end), 0)`,
    })
    .from(payments)
    .innerJoin(passes, eq(payments.passId, passes.id))
    .where(jettyClause);

  const widgets = [
    {
      label: "Monthly collected",
      value: formatMYR(Number(monthCollected?.cents ?? 0)),
      hint: `${monthStart.slice(0, 7)} · MYT month-to-date`,
    },
    {
      label: "Collected today",
      value: formatMYR(Number(todayCollected?.cents ?? 0)),
      hint: "MYT calendar day",
    },
    {
      label: "Paid",
      value: String(Number(statusCounts?.paid ?? 0)),
      hint: "All-time paid",
    },
    {
      label: "Unpaid / pending",
      value: String(Number(statusCounts?.pending ?? 0)),
      hint: "Awaiting payment",
    },
    {
      label: "Failed",
      value: String(Number(statusCounts?.failed ?? 0)),
      hint: "Failed attempts",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("admin.paymentsTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("admin.paymentsSub")}</p>
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        {widgets.map((w) => (
          <div
            key={w.label}
            className="rounded-lg bg-muted/40 px-4 py-3 ring-1 ring-foreground/10"
          >
            <p className="text-xs font-medium text-muted-foreground">
              {w.label}
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
              {w.value}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{w.hint}</p>
          </div>
        ))}
      </div>

      <PaymentsTable
        jetties={jettyOptions}
        rows={rows.map((r) => ({
          id: r.id,
          createdAt: r.createdAt.toISOString(),
          angler: r.angler,
          passRef: r.reference,
          amountCents: r.amountCents,
          method: methodLabel(r.provider),
          status: r.status,
        }))}
      />
    </div>
  );
}
