"use client";

import { useState } from "react";
import { MapPinned, Users } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/ux/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";
import { sideLabel } from "@/lib/utils-app";

export type HandlerPillarOccupant = {
  passId: string;
  reference: string;
  anglerName: string;
  checkedInAt: string | null;
};

export type HandlerPillarRow = {
  id: string;
  name: string;
  number: number;
  side: string;
  status: string;
  maxOccupancy: number;
  /** Slots held (checked-in + today's active/pending), same rule as angler buy. */
  held: number;
  occupants: HandlerPillarOccupant[];
};

export function HandlerPillarsPanel({
  subtitle,
  pillars,
}: {
  subtitle: string;
  pillars: HandlerPillarRow[];
}) {
  const { t, locale } = useT();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const timeFmt = new Intl.DateTimeFormat(locale === "ms" ? "ms-MY" : "en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    hour: "2-digit",
    minute: "2-digit",
  });

  const occupiedCount = pillars.filter((p) => p.held > 0).length;
  const onWater = pillars.reduce((n, p) => n + p.occupants.length, 0);
  const selected = pillars.find((p) => p.id === selectedId) ?? null;
  const selectedFull =
    selected != null && selected.held >= selected.maxOccupancy;

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold tracking-tight">
          {t("handler.pillarsTitle")}
        </h1>
        <p className="text-sm leading-normal text-muted-foreground">
          {subtitle}
        </p>
        <p className="text-xs leading-normal text-muted-foreground">
          {t("handler.pillarsSummary", {
            occupied: occupiedCount,
            total: pillars.length,
            onWater,
          })}
        </p>
      </div>

      {pillars.length === 0 ? (
        <EmptyState
          icon={MapPinned}
          title={t("handler.pillarsEmpty")}
          description={t("handler.pillarsEmptyHint")}
        />
      ) : (
        <ul className="animate-list-in grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          {pillars.map((p) => {
            const full = p.held >= p.maxOccupancy;
            const hasPeople = p.held > 0;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  className={cn(
                    "pressable flex h-full min-h-[7.5rem] w-full flex-col items-stretch gap-3 rounded-xl border border-border/80 bg-card p-4 text-left outline-none transition-colors",
                    "hover:border-border hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                    hasPeople && "border-sky-200/80 bg-sky-50/50 dark:border-sky-900/50 dark:bg-sky-950/20",
                    full && "border-amber-200/90 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/20",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-2 min-w-0 flex-1 text-sm font-semibold leading-snug tracking-tight">
                      {p.name}
                    </p>
                    <StatusBadge
                      status={full ? "OCCUPIED" : p.status}
                      label={full ? t("common.atCapacity") : undefined}
                      className="min-w-0 shrink-0 !min-w-0 px-2 text-[0.65rem]"
                    />
                  </div>
                  <div className="mt-auto flex flex-col gap-1">
                    <p className="text-xs leading-normal text-muted-foreground">
                      {sideLabel(p.side)}
                      <span className="mx-1 text-border">·</span>
                      #{p.number}
                    </p>
                    <p className="flex items-center gap-1.5 text-xs font-medium leading-normal">
                      <Users className="size-3.5 shrink-0 text-muted-foreground" />
                      {t("handler.pillarsCapacity", {
                        count: p.held,
                        max: p.maxOccupancy,
                      })}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog
        open={selectedId != null}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle>{selected.name}</DialogTitle>
                <DialogDescription>
                  {sideLabel(selected.side)}
                  <span className="mx-1">·</span>
                  #{selected.number}
                  <span className="mx-1">·</span>
                  {t("handler.pillarsCapacity", {
                    count: selected.held,
                    max: selected.maxOccupancy,
                  })}
                </DialogDescription>
              </DialogHeader>

              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">
                  {t("handler.pillarsWhoHere")}
                </p>
                <StatusBadge
                  status={selectedFull ? "OCCUPIED" : selected.status}
                  label={selectedFull ? t("common.atCapacity") : undefined}
                  className="shrink-0"
                />
              </div>

              {selected.occupants.length === 0 ? (
                <p className="rounded-lg bg-muted/50 px-4 py-6 text-center text-sm leading-normal text-muted-foreground">
                  {t("handler.pillarsNoneHere")}
                </p>
              ) : (
                <ul className="max-h-[50vh] divide-y divide-border/70 overflow-y-auto rounded-lg border border-border/80">
                  {selected.occupants.map((o) => (
                    <li
                      key={o.passId}
                      className="flex items-center justify-between gap-4 px-4 py-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium tracking-tight">
                          {o.anglerName}
                        </p>
                        <p className="truncate text-xs leading-normal text-muted-foreground">
                          <span className="font-mono">{o.reference}</span>
                          {o.checkedInAt ? (
                            <>
                              <span className="mx-1 text-border">·</span>
                              {t("handler.since")}{" "}
                              {timeFmt.format(new Date(o.checkedInAt))}
                            </>
                          ) : null}
                        </p>
                      </div>
                      <StatusBadge status="CHECKED_IN" className="shrink-0" />
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
