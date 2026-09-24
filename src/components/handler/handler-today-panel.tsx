"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/locale-provider";

export type HandlerTodayRow = {
  id: string;
  reference: string;
  status: string;
  validOn: string;
  anglerName: string;
  pillarName: string;
  checkedInAt: string | null;
};

export function HandlerTodayPanel({
  subtitle,
  checkedInCount,
  scannedInCount,
  scannedOutCount,
  rows,
}: {
  subtitle: string;
  checkedInCount: number;
  scannedInCount: number;
  scannedOutCount: number;
  rows: HandlerTodayRow[];
}) {
  const { t, locale } = useT();
  const [filter, setFilter] = useState<"onWater" | "all">("onWater");

  const visible = useMemo(
    () =>
      filter === "onWater"
        ? rows.filter((r) => r.status === "CHECKED_IN")
        : rows,
    [filter, rows],
  );

  const timeFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "ms" ? "ms-MY" : "en-MY", {
        timeZone: "Asia/Kuala_Lumpur",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [locale],
  );

  return (
    <div className="flex w-full flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("handler.todayAtJetty")}
        </h1>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>

      <Link
        href="/handler/scan"
        className={cn(buttonVariants(), "min-h-11 w-full sm:w-auto")}
      >
        {t("handler.openScanner")}
      </Link>

      <div className="grid grid-cols-2 gap-3">
        <Card className="border-border/80 shadow-sm">
          <CardContent className="px-4 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("handler.checkedInNow")}
            </p>
            <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">
              {checkedInCount}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/80 shadow-sm">
          <CardContent className="px-4 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("handler.youScanned")}
            </p>
            <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">
              {scannedInCount}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t("handler.checkOutsToday", { count: scannedOutCount })}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="inline-flex w-fit items-center gap-1 rounded-lg border border-border/70 p-0.5 text-xs">
        <button
          type="button"
          className={cn(
            "min-h-9 rounded-md px-3 font-medium transition-colors",
            filter === "onWater"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted",
          )}
          onClick={() => setFilter("onWater")}
        >
          {t("handler.onWater")}
          <span className="ml-1.5 tabular-nums opacity-80">
            {checkedInCount}
          </span>
        </button>
        <button
          type="button"
          className={cn(
            "min-h-9 rounded-md px-3 font-medium transition-colors",
            filter === "all"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted",
          )}
          onClick={() => setFilter("all")}
        >
          {t("handler.allToday")}
          <span className="ml-1.5 tabular-nums opacity-80">{rows.length}</span>
        </button>
      </div>

      {visible.length === 0 ? (
        <Alert>
          <AlertTitle>
            {filter === "onWater" ? t("handler.noneIn") : t("handler.noPassesYet")}
          </AlertTitle>
          {filter === "onWater" ? (
            <AlertDescription>{t("handler.noneInHint")}</AlertDescription>
          ) : null}
        </Alert>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((r) => {
            const timeLabel = r.checkedInAt
              ? timeFmt.format(new Date(r.checkedInAt))
              : r.validOn;
            return (
              <li key={r.id}>
                <Card className="border-border/80 shadow-sm">
                  <CardContent className="flex items-start justify-between gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold tracking-tight">
                        {r.anglerName}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {r.pillarName}
                        <span className="mx-1.5 text-border">·</span>
                        {timeLabel}
                      </p>
                      <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                        {r.reference}
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
