"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format, addDays } from "date-fns";
import { BoatSeatMap, type SeatMapSeat } from "@/components/booking/boat-seat-map";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { actionCreateBooking, actionMockPay } from "@/lib/actions/booking";
import {
  formatMYR,
  TIME_SLOTS,
  sideLabel,
  LOCATION_MAX_PAX,
} from "@/lib/utils-app";
import { toast } from "sonner";

type JettyOption = {
  id: string;
  name: string;
  area: string | null;
};

type LocationOption = {
  id: string;
  jettyId: string;
  number: number;
  side: string;
  name: string;
};

type BoatOption = {
  id: string;
  jettyId: string;
  name: string;
  capacity: number;
  pricePerPersonCents: number;
  handlerName: string;
  seats: SeatMapSeat[];
};

type TakenMap = Record<string, string[]>;
/** `${locationId}|${tripDate}` → occupied pax */
type OccupancyMap = Record<string, number>;

const STEPS = [
  "Jetty",
  "When",
  "Party",
  "Boat",
  "Seats",
  "Locations",
  "Pay",
] as const;

export function BookingWizard({
  jetties,
  locations,
  boats,
  takenByBoatSlot,
  occupancyByLocationDate,
}: {
  jetties: JettyOption[];
  locations: LocationOption[];
  boats: BoatOption[];
  takenByBoatSlot: TakenMap;
  occupancyByLocationDate: OccupancyMap;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [jettyId, setJettyId] = useState<string>("");
  const [tripDate, setTripDate] = useState(
    format(addDays(new Date(), 1), "yyyy-MM-dd"),
  );
  const [slotIdx, setSlotIdx] = useState(0);
  const [partySize, setPartySize] = useState(2);
  const [side, setSide] = useState<"GEORGETOWN" | "SEBERANG_PERAI" | "GENERAL">(
    "GENERAL",
  );
  const [boatId, setBoatId] = useState<string>("");
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  /** locationId → pax allocated */
  const [allocPax, setAllocPax] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [totalCents, setTotalCents] = useState(0);

  const slot = TIME_SLOTS[slotIdx];
  const selectedJetty = jetties.find((j) => j.id === jettyId);

  const jettyLocations = useMemo(
    () => locations.filter((t) => t.jettyId === jettyId),
    [locations, jettyId],
  );

  const sidesAvailable = useMemo(() => {
    const set = new Set(jettyLocations.map((l) => l.side));
    return [...set];
  }, [jettyLocations]);

  const isBridgeStyle =
    sidesAvailable.includes("GEORGETOWN") ||
    sidesAvailable.includes("SEBERANG_PERAI");

  const filteredLocations = useMemo(() => {
    if (!isBridgeStyle) return jettyLocations;
    return jettyLocations.filter((t) => t.side === side);
  }, [jettyLocations, isBridgeStyle, side]);

  const boat = boats.find((b) => b.id === boatId);
  const takenKey = boatId ? `${boatId}|${tripDate}|${slot.start}` : "";
  const takenIds = takenByBoatSlot[takenKey] ?? [];

  const maxParty = boat?.capacity ?? 20;

  const availableBoats = boats.filter(
    (b) => b.jettyId === jettyId && b.capacity >= partySize,
  );

  const allocatedTotal = useMemo(
    () => Object.values(allocPax).reduce((s, n) => s + (n || 0), 0),
    [allocPax],
  );

  const allocations = useMemo(
    () =>
      Object.entries(allocPax)
        .filter(([, pax]) => pax > 0)
        .map(([locationId, pax]) => ({ locationId, pax })),
    [allocPax],
  );

  function slotsLeft(locationId: string) {
    const occupied =
      occupancyByLocationDate[`${locationId}|${tripDate}`] ?? 0;
    return Math.max(0, LOCATION_MAX_PAX - occupied);
  }

  function selectJetty(id: string) {
    setJettyId(id);
    setBoatId("");
    setSelectedSeats([]);
    setAllocPax({});
    const locs = locations.filter((t) => t.jettyId === id);
    const sides = new Set(locs.map((l) => l.side));
    if (sides.has("GEORGETOWN")) setSide("GEORGETOWN");
    else if (sides.has("SEBERANG_PERAI")) setSide("SEBERANG_PERAI");
    else setSide("GENERAL");
  }

  function setLocationPax(locationId: string, raw: number) {
    const left = slotsLeft(locationId);
    const pax = Math.max(0, Math.min(left, Math.floor(raw) || 0));
    setAllocPax((prev) => {
      const next = { ...prev };
      if (pax <= 0) delete next[locationId];
      else next[locationId] = pax;
      return next;
    });
  }

  function next() {
    setError(null);
    if (step === 0 && !jettyId) {
      setError("Choose a jetty.");
      return;
    }
    if (step === 2) {
      if (partySize < 1) {
        setError("Party size must be at least 1.");
        return;
      }
    }
    if (step === 3 && !boatId) {
      setError("Choose a boat.");
      return;
    }
    if (step === 4) {
      if (selectedSeats.length !== partySize) {
        setError(`Select exactly ${partySize} seats.`);
        return;
      }
    }
    if (step === 5) {
      if (allocatedTotal !== partySize) {
        setError(
          `Allocate all ${partySize} people across locations (currently ${allocatedTotal}). Max ${LOCATION_MAX_PAX} per tiang.`,
        );
        return;
      }
      if (allocations.length === 0) {
        setError("Choose at least one location.");
        return;
      }
      for (const a of allocations) {
        if (a.pax > slotsLeft(a.locationId)) {
          setError("One location no longer has enough free slots.");
          return;
        }
      }
      startTransition(async () => {
        try {
          const result = await actionCreateBooking({
            boatId,
            tripDate,
            startTime: slot.start,
            endTime: slot.end,
            partySize,
            seatIds: selectedSeats,
            allocations,
          });
          setBookingId(result.bookingId);
          setTotalCents(result.totalCents);
          setStep(6);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Could not create booking.");
        }
      });
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    setError(null);
    if (step === 6) return;
    setStep((s) => Math.max(s - 1, 0));
  }

  function pay() {
    if (!bookingId) return;
    startTransition(async () => {
      try {
        await actionMockPay(bookingId);
        toast.success("Payment confirmed — boarding QR ready.");
        router.push(`/trips/${bookingId}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Payment failed.");
      }
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Book a trip</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Jetty → date → party → boat → seats → split locations (max{" "}
            {LOCATION_MAX_PAX}/tiang) → pay.
          </p>
        </div>
        {selectedJetty ? (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{selectedJetty.name}</span>
            {selectedJetty.area ? ` · ${selectedJetty.area}` : ""}
          </p>
        ) : null}
      </div>

      <ol className="flex flex-wrap items-center gap-1.5 text-xs">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-1.5">
            <span
              className={
                i === step
                  ? "inline-flex h-6 items-center rounded-md bg-primary px-2 font-medium text-primary-foreground"
                  : i < step
                    ? "inline-flex h-6 items-center rounded-md bg-secondary px-2 font-medium text-secondary-foreground"
                    : "inline-flex h-6 items-center rounded-md px-2 text-muted-foreground"
              }
            >
              {i + 1}. {label}
            </span>
            {i < STEPS.length - 1 ? (
              <span className="text-muted-foreground/50" aria-hidden>
                /
              </span>
            ) : null}
          </li>
        ))}
      </ol>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {step === 0 && (
        <section className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <div className="space-y-2">
            <Label>Jetty</Label>
            {jetties.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active jetties available.
              </p>
            ) : (
              <Select value={jettyId} onValueChange={(v) => v && selectJetty(v)}>
                <SelectTrigger className="min-h-11 w-full">
                  <SelectValue placeholder="Select fishing jetty" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {jetties.map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.name}
                      {j.area ? ` · ${j.area}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <aside className="rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            Open fishing locations are controlled by Admin based on LLM
            (Lembaga Lebuh Raya Malaysia) guidance for Penang Bridge pillars.
          </aside>
        </section>
      )}

      {step === 1 && (
        <section className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="date">Trip date</Label>
            <Input
              id="date"
              type="date"
              className="min-h-11"
              min={format(new Date(), "yyyy-MM-dd")}
              value={tripDate}
              onChange={(e) => {
                setTripDate(e.target.value);
                setSelectedSeats([]);
                setAllocPax({});
              }}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Time slot</Label>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {TIME_SLOTS.map((s, i) => (
                <button
                  key={s.start}
                  type="button"
                  onClick={() => {
                    setSlotIdx(i);
                    setSelectedSeats([]);
                  }}
                  className={`min-h-11 rounded-md border px-3 text-left text-sm ${
                    i === slotIdx
                      ? "border-foreground bg-accent"
                      : "border-border bg-background"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="grid max-w-md gap-4">
          <div className="space-y-2">
            <Label htmlFor="party">Party size</Label>
            <Input
              id="party"
              type="number"
              min={1}
              max={20}
              className="min-h-11"
              value={partySize}
              onChange={(e) => {
                const n = Math.min(20, Math.max(1, Number(e.target.value) || 1));
                setPartySize(n);
                setBoatId("");
                setSelectedSeats([]);
                setAllocPax({});
              }}
            />
            <p className="text-xs text-muted-foreground">
              Boat capacity is separate. Each tiang holds max {LOCATION_MAX_PAX}{" "}
              people — larger parties must split across locations.
              {partySize > LOCATION_MAX_PAX
                ? ` You will need at least ${Math.ceil(partySize / LOCATION_MAX_PAX)} locations.`
                : ""}
            </p>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="grid gap-3 sm:grid-cols-2">
          {availableBoats.length === 0 ? (
            <Alert className="sm:col-span-2">
              <AlertTitle>No boats</AlertTitle>
              <AlertDescription>
                No boats at this jetty fit party size {partySize}. Reduce party
                size or pick another jetty.
              </AlertDescription>
            </Alert>
          ) : (
            availableBoats.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  setBoatId(b.id);
                  setSelectedSeats([]);
                  setAllocPax({});
                }}
                className={`flex min-h-14 flex-col items-start rounded-md border px-4 py-3 text-left ${
                  boatId === b.id
                    ? "border-foreground bg-accent"
                    : "border-border bg-background"
                }`}
              >
                <span className="font-medium">{b.name}</span>
                <span className="text-sm text-muted-foreground">
                  {b.handlerName} · {b.capacity} seats ·{" "}
                  {formatMYR(b.pricePerPersonCents)}/person
                </span>
              </button>
            ))
          )}
        </section>
      )}

      {step === 4 && boat && (
        <div className="grid gap-6 lg:grid-cols-[1fr_240px]">
          <BoatSeatMap
            seats={boat.seats}
            takenIds={takenIds}
            partySize={partySize}
            selectedIds={selectedSeats}
            onChange={setSelectedSeats}
            boatName={boat.name}
          />
          <aside className="space-y-2 rounded-md border border-border p-4 text-sm">
            <p className="font-medium">{boat.name}</p>
            <p className="text-muted-foreground">
              Select {partySize} of {maxParty} seats for this trip.
            </p>
            <p className="text-muted-foreground">
              Selected: {selectedSeats.length}/{partySize}
            </p>
          </aside>
        </div>
      )}

      {step === 5 && (
        <section className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Allocate locations
              </h2>
              <p className="text-sm text-muted-foreground">
                Split {partySize} people across open tiangs. Max{" "}
                {LOCATION_MAX_PAX} per location. Allocated:{" "}
                <span className="font-medium text-foreground">
                  {allocatedTotal}/{partySize}
                </span>
              </p>
            </div>
            {isBridgeStyle ? (
              <div className="w-full sm:w-56">
                <Label className="sr-only">Side</Label>
                <Select
                  value={side}
                  onValueChange={(v) => {
                    if (
                      v === "GEORGETOWN" ||
                      v === "SEBERANG_PERAI" ||
                      v === "GENERAL"
                    ) {
                      setSide(v);
                    }
                  }}
                >
                  <SelectTrigger className="min-h-11 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sidesAvailable.includes("GEORGETOWN") ? (
                      <SelectItem value="GEORGETOWN">Georgetown</SelectItem>
                    ) : null}
                    {sidesAvailable.includes("SEBERANG_PERAI") ? (
                      <SelectItem value="SEBERANG_PERAI">
                        Seberang Perai
                      </SelectItem>
                    ) : null}
                    {sidesAvailable.includes("GENERAL") ? (
                      <SelectItem value="GENERAL">General</SelectItem>
                    ) : null}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>

          {filteredLocations.length === 0 ? (
            <Alert>
              <AlertTitle>No open locations</AlertTitle>
              <AlertDescription>
                No open location at this jetty for the selected side.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[36rem] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left">
                    <th className="px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">Location</th>
                    <th className="px-3 py-2 font-medium">Side</th>
                    <th className="px-3 py-2 font-medium">Free slots</th>
                    <th className="px-3 py-2 font-medium">Allocate</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLocations.map((t) => {
                    const left = slotsLeft(t.id);
                    const value = allocPax[t.id] ?? 0;
                    return (
                      <tr
                        key={t.id}
                        className="border-b border-border last:border-0"
                      >
                        <td className="px-3 py-2 tabular-nums">{t.number}</td>
                        <td className="px-3 py-2 font-medium">{t.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {sideLabel(t.side)}
                        </td>
                        <td className="px-3 py-2 tabular-nums">
                          {left}/{LOCATION_MAX_PAX}
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min={0}
                            max={left}
                            disabled={left === 0}
                            className="min-h-10 w-24"
                            value={value}
                            onChange={(e) =>
                              setLocationPax(t.id, Number(e.target.value))
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {allocations.length > 0 ? (
            <ul className="flex flex-wrap gap-2 text-xs">
              {allocations.map((a) => {
                const loc = locations.find((l) => l.id === a.locationId);
                return (
                  <li
                    key={a.locationId}
                    className="rounded-md border border-border bg-secondary px-2 py-1"
                  >
                    #{loc?.number} {loc?.name}: {a.pax}p
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>
      )}

      {step === 6 && bookingId && (
        <section className="grid gap-6 border-t border-border pt-5 lg:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold tracking-tight">Mock payment</h2>
            <p className="text-sm text-muted-foreground">
              Demo gateway — no real charge. Confirms the trip group and issues
              one boarding QR for all drop-off locations.
            </p>
            <ul className="space-y-1 text-sm">
              {allocations.map((a) => {
                const loc = locations.find((l) => l.id === a.locationId);
                return (
                  <li key={a.locationId}>
                    #{loc?.number} {loc?.name} — {a.pax} pax
                  </li>
                );
              })}
            </ul>
            <p className="text-2xl font-semibold">{formatMYR(totalCents)}</p>
            <Button
              className="min-h-11 w-full sm:w-auto sm:min-w-[14rem]"
              onClick={pay}
              disabled={pending}
            >
              {pending ? "Processing…" : "Pay with mock gateway"}
            </Button>
          </div>
        </section>
      )}

      {step < 6 && (
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="min-h-11"
            onClick={back}
            disabled={step === 0 || pending}
          >
            Back
          </Button>
          <Button className="min-h-11 flex-1 sm:flex-none sm:min-w-[12rem]" onClick={next} disabled={pending}>
            {pending && step === 5
              ? "Holding seats…"
              : step === 5
                ? "Continue to pay"
                : "Continue"}
          </Button>
        </div>
      )}
    </div>
  );
}
