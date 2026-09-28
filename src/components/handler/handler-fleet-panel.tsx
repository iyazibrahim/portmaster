"use client";

import { useState } from "react";
import { Ship } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/ux/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";
import { formatDateMY, formatMYR } from "@/lib/utils-app";

export type HandlerFleetBoat = {
  id: string;
  name: string;
  registration: string | null;
  capacity: number;
  status: string;
  owner: string | null;
  jettyName: string | null;
  permitExpiresAt: string | null;
  licenceInfo: string | null;
  pricePerPersonCents: number;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <dt className="shrink-0 text-xs leading-normal text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 text-right text-sm font-medium leading-normal tracking-tight break-words">
        {value}
      </dd>
    </div>
  );
}

export function HandlerFleetPanel({ boats }: { boats: HandlerFleetBoat[] }) {
  const { t } = useT();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = boats.find((b) => b.id === selectedId) ?? null;

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold tracking-tight">
          {t("handler.fleetTitle")}
        </h1>
        <p className="text-sm leading-normal text-muted-foreground">
          {t("handler.fleetSub")}
        </p>
      </div>

      {boats.length === 0 ? (
        <EmptyState
          icon={Ship}
          title={t("handler.fleetEmptyTitle")}
          description={t("handler.fleetEmptyBody")}
        />
      ) : (
        <>
          <ul className="animate-list-in divide-y divide-border/70 overflow-hidden rounded-xl border border-border/80 bg-card md:hidden">
            {boats.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(b.id)}
                  className={cn(
                    "pressable flex w-full items-start justify-between gap-4 px-4 py-4 text-left outline-none transition-colors",
                    "hover:bg-muted/40 focus-visible:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium tracking-tight">
                      {b.name}
                    </p>
                    <p className="truncate text-xs leading-normal text-muted-foreground">
                      <span className="font-mono">{b.registration ?? "—"}</span>
                      <span className="mx-1 text-border">·</span>
                      {b.owner ?? "—"}
                      <span className="mx-1 text-border">·</span>
                      {t("handler.fleetSeats", { count: b.capacity })}
                    </p>
                  </div>
                  <StatusBadge status={b.status} className="shrink-0" />
                </button>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-hidden rounded-lg ring-1 ring-foreground/10 md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.name")}</TableHead>
                  <TableHead>{t("handler.fleetReg")}</TableHead>
                  <TableHead>{t("common.owner")}</TableHead>
                  <TableHead>{t("handler.fleetCapacity")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {boats.map((b) => (
                  <TableRow
                    key={b.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedId(b.id)}
                  >
                    <TableCell>{b.name}</TableCell>
                    <TableCell className="font-mono">
                      {b.registration ?? "—"}
                    </TableCell>
                    <TableCell>{b.owner ?? "—"}</TableCell>
                    <TableCell>{b.capacity}</TableCell>
                    <TableCell>
                      <StatusBadge status={b.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
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
                  {selected.registration ?? t("handler.fleetNoReg")}
                </DialogDescription>
              </DialogHeader>

              <div className="flex justify-end">
                <StatusBadge status={selected.status} />
              </div>

              <dl className="divide-y divide-border/70 rounded-lg border border-border/80 px-4">
                <DetailRow
                  label={t("handler.fleetReg")}
                  value={selected.registration ?? "—"}
                />
                <DetailRow
                  label={t("common.owner")}
                  value={selected.owner ?? "—"}
                />
                <DetailRow
                  label={t("common.jetty")}
                  value={selected.jettyName ?? "—"}
                />
                <DetailRow
                  label={t("handler.fleetCapacity")}
                  value={t("handler.fleetSeats", { count: selected.capacity })}
                />
                <DetailRow
                  label={t("handler.fleetPermit")}
                  value={
                    selected.permitExpiresAt
                      ? formatDateMY(selected.permitExpiresAt)
                      : "—"
                  }
                />
                <DetailRow
                  label={t("common.licence")}
                  value={selected.licenceInfo?.trim() || "—"}
                />
                <DetailRow
                  label={t("handler.fleetPrice")}
                  value={
                    selected.pricePerPersonCents > 0
                      ? formatMYR(selected.pricePerPersonCents)
                      : "—"
                  }
                />
              </dl>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
