"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { CancelPassActions } from "@/components/pass/cancel-pass-actions";
import { canCancelPass } from "@/domain/pass";
import type { PassStatus } from "@/db/schema";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/locale-provider";

const PREVIEW_COUNT = 5;

export type TripsPassRow = {
  id: string;
  reference: string;
  status: string;
  validOn: string;
  jetty: string | null;
  pillar: string | null;
};

export function TripsPassList({ rows }: { rows: TripsPassRow[] }) {
  const { t } = useT();
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? rows : rows.slice(0, PREVIEW_COUNT);
  const hasMore = rows.length > PREVIEW_COUNT;

  return (
    <div className="flex flex-col gap-4">
      <div className="animate-list-in grid gap-4">
        {visible.map((r) => (
          <Card key={r.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pt-4 pb-2">
              <CardTitle className="font-mono text-sm">{r.reference}</CardTitle>
              <StatusBadge status={r.status} />
            </CardHeader>
            <CardContent className="flex flex-col gap-4 px-4 pb-4 text-sm">
              <div className="flex flex-col gap-1">
                <p className="font-medium">{r.jetty}</p>
                <p className="text-xs leading-normal text-muted-foreground">
                  {r.pillar} · {r.validOn}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <Link
                  href={`/pass/${r.id}`}
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "inline-flex w-full sm:w-auto",
                  )}
                >
                  {t("trips.view")}
                </Link>
                {canCancelPass(r.status as PassStatus) ? (
                  <CancelPassActions
                    passId={r.id}
                    status={r.status}
                    pillarName={r.pillar}
                    layout="inline"
                  />
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {hasMore ? (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded
            ? t("trips.showLess")
            : t("trips.seeAll", { total: rows.length })}
        </Button>
      ) : null}
    </div>
  );
}
