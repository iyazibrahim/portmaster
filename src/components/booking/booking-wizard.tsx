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
import { SearchableSelect } from "@/components/ui/searchable-select";
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

const PAGE_SIZE = 10;

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
  const [allocPax, setAllocPax] = useState<Record<string, number>>({});
  const [locQuery, setLocQuery] = useState("");
  const [locPage, setLocPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [totalCents, setTotalCents] = useState(0);

  const slot = TIME_SLOTS[slotIdx];
  const selectedJetty = jetties.find((j) => j.id === jettyId);

  const jettyOptions = useMemo(
    () =>
      jetties.map((j) => ({
        value: j.id,
        label: j.area ? `${j.name} · ${j.area}` : j.name,
        keywords: `${j.name} ${j.area ?? ""}`,
      })),
    [jetties],
  );

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

  const sideFiltered = useMemo(() => {
    if (!isBridgeStyle) return jettyLocations;
    return jettyLocations.filter((t) => t.side === side);
  }, [jettyLocations, isBridgeStyle, side]);

  const searchedLocations = useMemo(() => {
    const q = locQuery.trim().toLowerCase();
    if (!q) return sideFiltered;
    return sideFiltered.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        String(t.number).includes(q) ||
        sideLabel(t.side).toLowerCase().includes(q),
    );
  }, [sideFiltered, locQuery]);

  const pageCount = Math.max(1, Math.ceil(searchedLocations.length / PAGE_SIZE));
  const safePage = Math.min(locPage, pageCount - 1);
  const pageRows = searchedLocations.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );

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
    setLocQuery("");
    setLocPage(0);
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
    if (step === 2 && partySize < 1) {
      setError("Party size must be at least 1.");
      return;
    }
    if (step === 3 && !boatId) {
      setError("Choose a boat.");
      return;
    }
    if (step === 4 && selectedSeats.length !== partySize) {
      setError(`Select exactly ${partySize} seats.`);
      return;
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
    <div className="w-full space-y-5">
      <div className="flex flex-col gap-3 border-b border-border pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Book a trip</h1>
          {selectedJetty ? (
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {selectedJetty.name}
              </span>
              {selectedJetty.area ? ` · ${selectedJetty.area}` : ""}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Choose jetty, boat, seats, then allocate locations.
            </p>
          )}
        </div>
        <ol className="flex flex-wrap items-center gap-1.5 text-xs">
          {STEPS.map((label, i) => (
            <li key={label} className="flex items-center gap-1.5">
              <span
                className={
                  i === step
                    ? "inline-flex h-7 items-center rounded-md bg-primary px-2.5 font-medium text-primary-foreground"
                    : i < step
                      ? "inline-flex h-7 items-center rounded-md bg-secondary px-2.5 font-medium text-secondary-foreground"
                      : "inline-flex h-7 items-center rounded-md px-2.5 text-muted-foreground"
                }
              >
                {i + 1}. {label}
              </span>
              {i < STEPS.length - 1 ? (
                <span className="text-muted-foreground/40" aria-hidden>
                  /
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {step === 0 && (
        <section className="max-w-xl space-y-2">
          <Label>Jetty</Label>
          {jetties.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No active jetties available.
            </p>
          ) : (
            <SearchableSelect
              options={jettyOptions}
              value={jettyId}
              onValueChange={selectJetty}
              placeholder="Select fishing jetty"
              searchPlaceholder="Search jetty name…"
            />
          )}
        </section>
      )}

      {step === 1 && (
        <section className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="date">Trip date</Label>
            <Input
              id="date"
              type="date"
              className="min-h-11 max-w-xs"
              min={format(new Date(), "yyyy-MM-dd")}
              value={tripDate}
              onChange={(e) => {
                setTripDate(e.target.value);
                setSelectedSeats([]);
                setAllocPax({});
              }}
            />
          </div>
          <div className="space-y-2 lg:col-span-2">
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
        <section className="max-w-sm space-y-2">
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
            Max {LOCATION_MAX_PAX} people per location. Larger parties split
            across tiangs.
            {partySize > LOCATION_MAX_PAX
              ? ` Need at least ${Math.ceil(partySize / LOCATION_MAX_PAX)} locations.`
              : ""}
          </p>
        </section>
      )}

      {step === 3 && (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {availableBoats.length === 0 ? (
            <Alert className="sm:col-span-2 xl:col-span-3">
              <AlertTitle>No boats</AlertTitle>
              <AlertDescription>
                No boats at this jetty fit party size {partySize}.
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
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px]">
          <BoatSeatMap
            seats={boat.seats}
            takenIds={takenIds}
            partySize={partySize}
            selectedIds={selectedSeats}
            onChange={setSelectedSeats}
            boatName={boat.name}
          />
          <aside className="h-fit space-y-2 rounded-md border border-border p-4 text-sm">
            <p className="font-medium">{boat.name}</p>
            <p className="text-muted-foreground">
              Select {partySize} of {maxParty} seats.
            </p>
            <p className="tabular-nums text-muted-foreground">
              Selected: {selectedSeats.length}/{partySize}
            </p>
          </aside>
        </div>
      )}

      {step === 5 && (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Allocate locations
              </h2>
              <p className="text-sm text-muted-foreground">
                Max {LOCATION_MAX_PAX} per tiang · Allocated{" "}
                <span className="font-medium text-foreground">
                  {allocatedTotal}/{partySize}
                </span>
                {searchedLocations.length > 0
                  ? ` · ${searchedLocations.length} locations`
                  : ""}
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
              <Input
                className="min-h-11 sm:w-56"
                placeholder="Search # or name…"
                value={locQuery}
                onChange={(e) => {
                  setLocQuery(e.target.value);
                  setLocPage(0);
                }}
              />
              {isBridgeStyle ? (
                <Select
                  value={side}
                  onValueChange={(v) => {
                    if (
                      v === "GEORGETOWN" ||
                      v === "SEBERANG_PERAI" ||
                      v === "GENERAL"
                    ) {
                      setSide(v);
                      setLocPage(0);
                    }
                  }}
                >
                  <SelectTrigger className="min-h-11 w-full sm:w-48">
                    <SelectValue>
                      {side === "GEORGETOWN"
                        ? "Georgetown"
                        : side === "SEBERANG_PERAI"
                          ? "Seberang Perai"
                          : "General"}
                    </SelectValue>
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
              ) : null}
            </div>
          </div>

          {searchedLocations.length === 0 ? (
            <Alert>
              <AlertTitle>No locations</AlertTitle>
              <AlertDescription>
                No open locations match this filter.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full min-w-[36rem] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left">
                      <th className="px-3 py-2.5 font-medium">#</th>
                      <th className="px-3 py-2.5 font-medium">Location</th>
                      <th className="px-3 py-2.5 font-medium">Side</th>
                      <th className="px-3 py-2.5 font-medium">Free slots</th>
                      <th className="px-3 py-2.5 font-medium">Allocate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((t) => {
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

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {safePage + 1} of {pageCount}
                  {locQuery ? ` · filtered` : ""}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-10"
                    disabled={safePage <= 0}
                    onClick={() => setLocPage((p) => Math.max(0, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-10"
                    disabled={safePage >= pageCount - 1}
                    onClick={() =>
                      setLocPage((p) => Math.min(pageCount - 1, p + 1))
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
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
            <h2 className="text-lg font-semibold tracking-tight">
              Mock payment
            </h2>
            <p className="text-sm text-muted-foreground">
              Demo gateway — confirms the trip and issues one boarding QR.
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
        <div className="flex gap-3 border-t border-border pt-4">
          <Button
            variant="outline"
            className="min-h-11"
            onClick={back}
            disabled={step === 0 || pending}
          >
            Back
          </Button>
          <Button
            className="min-h-11 min-w-[10rem]"
            onClick={next}
            disabled={pending}
          >
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
