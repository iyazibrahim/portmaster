"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/locale-provider";

const PAGE_SIZE_SM = 6;
const PAGE_SIZE_MD = 12;

export type PillarBarItem = {
  id: string;
  label: string;
  occupied: number;
  max: number;
};

function usePageSize() {
  const [size, setSize] = useState(PAGE_SIZE_MD);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const apply = () => setSize(mq.matches ? PAGE_SIZE_SM : PAGE_SIZE_MD);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return size;
}

export function PillarBarsCarousel({ bars }: { bars: PillarBarItem[] }) {
  const { t } = useT();
  const pageSize = usePageSize();
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(bars.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const slice = bars.slice(
    safePage * pageSize,
    safePage * pageSize + pageSize,
  );
  const slots: (PillarBarItem | null)[] = [
    ...slice,
    ...Array.from({ length: pageSize - slice.length }, () => null),
  ];

  const from = bars.length === 0 ? 0 : safePage * pageSize + 1;
  const to = Math.min((safePage + 1) * pageSize, bars.length);

  return (
    <div>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          disabled={safePage <= 0}
          aria-label={t("common.previous")}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          <ChevronLeft className="size-4" />
        </Button>

        <div className="flex h-40 min-w-0 flex-1 items-end gap-1.5 sm:gap-2">
          {slots.map((b, i) => {
            if (!b) {
              return (
                <div
                  key={`empty-${i}`}
                  className="flex flex-1 flex-col items-center gap-1 opacity-0"
                  aria-hidden
                >
                  <div className="h-28 w-full" />
                  <span className="text-[10px]">—</span>
                </div>
              );
            }
            const pct = (b.occupied / b.max) * 100;
            const color =
              b.occupied >= b.max
                ? "bg-emerald-600"
                : b.occupied > 0
                  ? "bg-amber-400"
                  : "bg-muted/80";
            return (
              <div
                key={b.id}
                className="flex min-w-0 flex-1 flex-col items-center gap-1"
              >
                <div className="flex h-28 w-full items-end rounded bg-muted/40">
                  <div
                    className={`w-full rounded-t ${color}`}
                    style={{
                      height: `${Math.max(pct, b.occupied ? 12 : 4)}%`,
                    }}
                    title={`${b.label}: ${b.occupied}/${b.max}`}
                  />
                </div>
                <span className="max-w-full truncate text-[9px] text-muted-foreground sm:text-[10px]">
                  {b.label}
                </span>
              </div>
            );
          })}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          disabled={safePage >= totalPages - 1}
          aria-label={t("common.next")}
          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-sm bg-amber-400" /> Occupied
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-sm bg-emerald-600" /> At capacity
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-sm bg-muted/80" /> Empty
          </span>
        </div>
        {bars.length > pageSize ? (
          <p className="text-[10px] tabular-nums text-muted-foreground">
            {from}–{to} of {bars.length}
          </p>
        ) : null}
      </div>
    </div>
  );
}
