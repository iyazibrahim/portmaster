import { and, desc, eq, inArray, or } from "drizzle-orm";
import { requireRole } from "@/lib/session";
import { db } from "@/db";
import { handlers, jetties, locations, passes, users } from "@/db/schema";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { todayMYT } from "@/lib/utils-app";
import { getTranslator } from "@/i18n";
import { SoftLiveRefresh } from "@/components/soft-live-refresh";

export default async function HandlerHomePage() {
  const session = await requireRole(["HANDLER", "ADMIN"]);
  const { t } = await getTranslator();
  const [handler] = await db
    .select({
      id: handlers.id,
      displayName: handlers.displayName,
      jettyId: handlers.jettyId,
      jettyName: jetties.name,
    })
    .from(handlers)
    .leftJoin(jetties, eq(handlers.jettyId, jetties.id))
    .where(eq(handlers.userId, session.user.id))
    .limit(1);

  if (!handler && session.user.role === "HANDLER") {
    return (
      <Alert variant="destructive">
        <AlertTitle>{t("handler.noProfile")}</AlertTitle>
        <AlertDescription>{t("handler.noProfileHint")}</AlertDescription>
      </Alert>
    );
  }

  if (handler && !handler.jettyId) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Operator jetty missing</AlertTitle>
        <AlertDescription>
          Your operator profile has no jetty. Ask Association Admin to assign
          one.
        </AlertDescription>
      </Alert>
    );
  }

  const jettyId = handler?.jettyId;
  const today = todayMYT();

  const rows = jettyId
    ? await db
        .select({
          id: passes.id,
          reference: passes.reference,
          status: passes.status,
          validOn: passes.validOn,
          anglerName: users.name,
          pillarName: locations.name,
          checkedInAt: passes.checkedInAt,
        })
        .from(passes)
        .innerJoin(users, eq(passes.userId, users.id))
        .innerJoin(locations, eq(passes.pillarId, locations.id))
        .where(
          and(
            eq(passes.jettyId, jettyId),
            or(
              and(
                eq(passes.validOn, today),
                inArray(passes.status, [
                  "ACTIVE",
                  "CHECKED_IN",
                  "CHECKED_OUT",
                  "PENDING_PAYMENT",
                ]),
              ),
              eq(passes.status, "CHECKED_IN"),
            ),
          ),
        )
        .orderBy(desc(passes.updatedAt))
        .limit(50)
    : [];

  const live = rows.filter((r) => r.status === "CHECKED_IN");

  return (
    <div className="flex w-full flex-col gap-6">
      <SoftLiveRefresh />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("handler.todayAtJetty")}
          </h1>
          <p className="text-muted-foreground">
            {handler
              ? `${handler.displayName} · ${handler.jettyName} · ${today}`
              : t("handler.adminView", { date: today })}
          </p>
        </div>
        <Link href="/handler/scan" className={cn(buttonVariants())}>
          {t("handler.openScanner")}
        </Link>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium">{t("handler.checkedInNow")}</h2>
        {live.length === 0 ? (
          <Alert>
            <AlertTitle>{t("handler.noneIn")}</AlertTitle>
            <AlertDescription>{t("handler.noneInHint")}</AlertDescription>
          </Alert>
        ) : (
          <div className="overflow-x-auto rounded-lg ring-1 ring-foreground/10">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("handler.angler")}</TableHead>
                  <TableHead>{t("admin.col.pillar")}</TableHead>
                  <TableHead>{t("handler.pass")}</TableHead>
                  <TableHead>{t("handler.since")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {live.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.anglerName}</TableCell>
                    <TableCell>{r.pillarName}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {r.reference}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.checkedInAt?.toLocaleString() ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium">Passes (today + stayovers)</h2>
        <div className="overflow-x-auto rounded-lg ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Angler</TableHead>
                <TableHead>Pillar</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Pass</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    No passes for this jetty yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.anglerName}</TableCell>
                    <TableCell>{r.pillarName}</TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {r.reference}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
