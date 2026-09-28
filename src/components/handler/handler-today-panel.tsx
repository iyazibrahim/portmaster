"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/locale-provider";

const PAGE_SIZE = 10;

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
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    const base =
      filter === "onWater"
        ? rows.filter((r) => r.status === "CHECKED_IN")
        : rows;
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (r) =>
        r.anglerName.toLowerCase().includes(q) ||
        r.reference.toLowerCase().includes(q) ||
        r.pillarName.toLowerCase().includes(q),
    );
  }, [filter, rows, query]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  const timeFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "ms" ? "ms-MY" : "en-MY", {
        timeZone: "Asia/Kuala_Lumpur",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [locale],
  );

  function switchFilter(next: "onWater" | "all") {
    setFilter(next);
    setVisibleCount(PAGE_SIZE);
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("handler.todayAtJetty")}
        </h1>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>

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

      <div className="flex flex-col gap-3">
        <div className="inline-flex w-fit items-center gap-1 rounded-lg border border-border/70 p-0.5 text-xs">
          <button
            type="button"
            className={cn(
              "min-h-9 rounded-md px-3 font-medium transition-colors",
              filter === "onWater"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
            onClick={() => switchFilter("onWater")}
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
            onClick={() => switchFilter("all")}
          >
            {t("handler.allToday")}
            <span className="ml-1.5 tabular-nums opacity-80">{rows.length}</span>
          </button>
        </div>

        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            placeholder={t("handler.searchPlaceholder")}
            className="min-h-11 pl-9"
            inputMode="search"
            autoComplete="off"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Alert>
          <AlertTitle>
            {query.trim()
              ? t("handler.noSearchMatch")
              : filter === "onWater"
                ? t("handler.noneIn")
                : t("handler.noPassesYet")}
          </AlertTitle>
          {!query.trim() && filter === "onWater" ? (
            <AlertDescription>{t("handler.noneInHint")}</AlertDescription>
          ) : null}
        </Alert>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            {t("handler.showingCount", {
              shown: visible.length,
              total: filtered.length,
            })}
          </p>
          <ul className="divide-y divide-border/70 overflow-hidden rounded-xl border border-border/80 bg-card">
            {visible.map((r) => {
              const timeLabel = r.checkedInAt
                ? timeFmt.format(new Date(r.checkedInAt))
                : r.validOn;
              return (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium tracking-tight">
                      {r.anglerName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.pillarName}
                      <span className="mx-1 text-border">·</span>
                      {timeLabel}
                      <span className="mx-1 text-border">·</span>
                      <span className="font-mono">{r.reference}</span>
                    </p>
                  </div>
                  <StatusBadge
                    status={r.status}
                    className="min-w-0 shrink-0"
                  />
                </li>
              );
            })}
          </ul>
          {hasMore ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full"
              onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
            >
              {t("handler.showMore", {
                remaining: filtered.length - visible.length,
              })}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
