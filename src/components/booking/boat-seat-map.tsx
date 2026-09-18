"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export type SeatMapSeat = {
  id: string;
  label: string;
  row: number;
  col: number;
  blocked: boolean;
};

type Props = {
  seats: SeatMapSeat[];
  takenIds: string[];
  partySize: number;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  boatName?: string;
};

export function BoatSeatMap({
  seats,
  takenIds,
  partySize,
  selectedIds,
  onChange,
  boatName,
}: Props) {
  const [pressedId, setPressedId] = useState<string | null>(null);
  const taken = useMemo(() => new Set(takenIds), [takenIds]);
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  const maxRow = Math.max(...seats.map((s) => s.row), 0);
  const maxCol = Math.max(...seats.map((s) => s.col), 0);

  useEffect(() => {
    if (!pressedId) return;
    const t = setTimeout(() => setPressedId(null), 200);
    return () => clearTimeout(t);
  }, [pressedId]);

  function toggle(seat: SeatMapSeat) {
    if (seat.blocked || taken.has(seat.id)) return;
    setPressedId(seat.id);
    if (selected.has(seat.id)) {
      onChange(selectedIds.filter((id) => id !== seat.id));
      return;
    }
    if (selectedIds.length >= partySize) return;
    onChange([...selectedIds, seat.id]);
  }

  const selectedLabels = seats
    .filter((s) => selected.has(s.id))
    .map((s) => s.label)
    .join(", ");

  return (
    <div className="animate-boat-settle space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Deck plan</p>
          <h3 className="text-lg font-semibold tracking-tight">
            {boatName ?? "Select seats"}
          </h3>
        </div>
        <p className="text-sm tabular-nums text-muted-foreground">
          {selectedIds.length}/{partySize} selected
        </p>
      </div>

      <div className="mx-auto max-w-sm">
        <div
          className="mb-1 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
          aria-hidden
        >
          Bow
        </div>

        <div
          className="rounded-xl border border-border bg-muted/40 px-3 py-4"
          role="group"
          aria-label="Boat seat map"
        >
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${maxCol + 1}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${maxRow + 1}, minmax(2.75rem, auto))`,
            }}
          >
            {seats.map((seat) => {
              const isTaken = taken.has(seat.id);
              const isSelected = selected.has(seat.id);
              const isBlocked = seat.blocked;
              let state: "available" | "selected" | "taken" | "blocked" =
                "available";
              if (isBlocked) state = "blocked";
              else if (isTaken) state = "taken";
              else if (isSelected) state = "selected";

              const labelText =
                state === "available"
                  ? "available"
                  : state === "selected"
                    ? "selected"
                    : state === "taken"
                      ? "taken"
                      : "blocked";

              return (
                <button
                  key={seat.id}
                  type="button"
                  disabled={isBlocked || isTaken}
                  aria-pressed={isSelected}
                  aria-label={`Seat ${seat.label}, ${labelText}`}
                  onClick={() => toggle(seat)}
                  style={{
                    gridRow: seat.row + 1,
                    gridColumn: seat.col + 1,
                  }}
                  className={cn(
                    "flex min-h-11 min-w-11 flex-col items-center justify-center rounded-md border text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    pressedId === seat.id && "animate-seat-press",
                    state === "available" &&
                      "border-border bg-background text-foreground hover:bg-accent",
                    state === "selected" &&
                      "border-primary bg-primary text-primary-foreground",
                    state === "taken" &&
                      "cursor-not-allowed border-transparent bg-muted text-muted-foreground",
                    state === "blocked" &&
                      "cursor-not-allowed border-dashed border-muted-foreground/40 bg-muted/50 text-muted-foreground",
                  )}
                >
                  <span>{seat.label}</span>
                  <span className="text-[9px] font-normal uppercase opacity-70">
                    {labelText}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div
          className="mt-1 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
          aria-hidden
        >
          Stern
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <Legend swatch="border bg-background" label="Available" />
        <Legend swatch="bg-primary" label="Selected" />
        <Legend swatch="bg-muted" label="Taken" />
        <Legend
          swatch="border border-dashed bg-muted/50"
          label="Blocked"
        />
      </div>

      {selectedLabels ? (
        <p className="text-sm">
          <span className="text-muted-foreground">Your seats: </span>
          <span className="font-medium">{selectedLabels}</span>
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Tap {partySize} seat{partySize === 1 ? "" : "s"} on the deck plan.
        </p>
      )}
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-3 rounded-sm", swatch)} />
      {label}
    </span>
  );
}
