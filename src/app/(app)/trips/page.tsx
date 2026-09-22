import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { requireSession } from "@/lib/session";
import { db } from "@/db";
import { jetties, locations, passes } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import { getTranslator } from "@/i18n";
import { SoftLiveRefresh } from "@/components/soft-live-refresh";

export default async function TripsPage() {
  const session = await requireSession();
  const { t } = await getTranslator();
  if (session.user.role === "HANDLER") {
    return (
      <p className="text-sm text-muted-foreground">{t("scan.subtitle")}</p>
    );
  }

  const rows = await db
    .select({
      id: passes.id,
      reference: passes.reference,
      status: passes.status,
      validOn: passes.validOn,
      jetty: jetties.name,
      pillar: locations.name,
    })
    .from(passes)
    .leftJoin(jetties, eq(passes.jettyId, jetties.id))
    .leftJoin(locations, eq(passes.pillarId, locations.id))
    .where(eq(passes.userId, session.user.id))
    .orderBy(desc(passes.createdAt));

  return (
    <div className="mx-auto w-full max-w-lg space-y-6 lg:max-w-xl">
      <SoftLiveRefresh />
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("trips.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            Same-day Association fishing passes.
          </p>
        </div>
        <Link
          href="/pass"
          className={cn(buttonVariants(), "inline-flex min-h-11 w-full sm:w-auto")}
        >
          Buy today&apos;s pass
        </Link>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="px-4 py-8 text-sm text-muted-foreground sm:px-5">
            No passes yet.{" "}
            <Link href="/pass" className="text-primary underline-offset-4 hover:underline">
              Purchase a pass
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {rows.map((r) => (
            <Card key={r.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pb-2 pt-4 sm:px-5 sm:pt-5">
                <CardTitle className="font-mono text-sm">
                  {r.reference}
                </CardTitle>
                <StatusBadge status={r.status} />
              </CardHeader>
              <CardContent className="flex flex-col gap-3 px-4 pb-4 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5 sm:pb-5">
                <div>
                  <p>{r.jetty}</p>
                  <p className="text-muted-foreground">
                    {r.pillar} · {r.validOn}
                  </p>
                </div>
                <Link
                  href={`/pass/${r.id}`}
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "inline-flex min-h-11 w-full sm:w-auto",
                  )}
                >
                  View
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
