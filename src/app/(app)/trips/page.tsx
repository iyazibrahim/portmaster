import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { Ticket } from "lucide-react";
import { requireSession } from "@/lib/session";
import { db } from "@/db";
import { jetties, locations, passes } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ux/empty-state";
import { TripsPassList } from "@/components/pass/trips-pass-list";
import { getTranslator } from "@/i18n";

export default async function TripsPage() {
  const session = await requireSession();
  const { t } = await getTranslator();
  if (session.user.role === "HANDLER") {
    return (
      <p className="text-sm leading-normal text-muted-foreground">
        {t("scan.subtitle")}
      </p>
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
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 lg:max-w-xl">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex flex-col gap-2">
          <h1 className="text-xl font-semibold tracking-tight">
            {t("trips.title")}
          </h1>
          <p className="text-sm leading-normal text-muted-foreground">
            {t("trips.subtitle")}
          </p>
        </div>
        <Button render={<Link href="/pass" />} className="shrink-0">
          {t("trips.buyCta")}
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title={t("trips.empty")}
          actionLabel={t("pass.buy")}
          actionHref="/pass"
        />
      ) : (
        <TripsPassList rows={rows} />
      )}
    </div>
  );
}
