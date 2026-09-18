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
import { formatMYR, TIME_SLOTS, sideLabel } from "@/lib/utils-app";
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

const STEPS = [
  "Jetty",
  "When",
  "Party",
  "Location",
  "Boat",
  "Seats",
  "Pay",
] as const;

export function BookingWizard({
  jetties,
  locations,
  boats,
  takenByBoatSlot,
}: {
  jetties: JettyOption[];
  locations: LocationOption[];
  boats: BoatOption[];
  takenByBoatSlot: TakenMap;
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
  const [locationId, setLocationId] = useState<string>("");
  const [boatId, setBoatId] = useState<string>("");
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
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

  const availableBoats = boats.filter(
    (b) => b.jettyId === jettyId && b.capacity >= partySize,
  );

  function selectJetty(id: string) {
    setJettyId(id);
    setLocationId("");
    setBoatId("");
    setSelectedSeats([]);
    const locs = locations.filter((t) => t.jettyId === id);
    const sides = new Set(locs.map((l) => l.side));
    if (sides.has("GEORGETOWN")) setSide("GEORGETOWN");
    else if (sides.has("SEBERANG_PERAI")) setSide("SEBERANG_PERAI");
    else setSide("GENERAL");
  }

  function next() {
    setError(null);
    if (step === 0 && !jettyId) {
      setError("Choose a jetty.");
      return;
    }
    if (step === 3 && !locationId) {
      setError("Choose a location.");
      return;
    }
    if (step === 4 && !boatId) {
      setError("Choose a boat.");
      return;
    }
    if (step === 5) {
      if (selectedSeats.length !== partySize) {
        setError(`Select exactly ${partySize} seats.`);
        return;
      }
      startTransition(async () => {
        try {
          const result = await actionCreateBooking({
            locationId,
            boatId,
            tripDate,
            startTime: slot.start,
            endTime: slot.end,
            partySize,
            seatIds: selectedSeats,
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
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Book a trip</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Jetty → date → party → location → boat → seats → pay.
        </p>
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
        <section className="space-y-4">
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
          {selectedJetty ? (
            <p className="text-sm text-muted-foreground">
              Booking at <span className="font-medium text-foreground">{selectedJetty.name}</span>
              {selectedJetty.area ? ` (${selectedJetty.area})` : ""}.
            </p>
          ) : null}
        </section>
      )}

      {step === 1 && (
        <section className="space-y-4">
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
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Time slot</Label>
            <div className="grid gap-2 sm:grid-cols-2">
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
        <section className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="party">Party size</Label>
            <Input
              id="party"
              type="number"
              min={1}
              max={10}
              className="min-h-11"
              value={partySize}
              onChange={(e) => {
                setPartySize(Number(e.target.value) || 1);
                setBoatId("");
                setSelectedSeats([]);
              }}
            />
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-4">
          {isBridgeStyle ? (
            <div className="space-y-2">
              <Label>Side</Label>
              <Select
                value={side}
                onValueChange={(v) => {
                  if (
                    v === "GEORGETOWN" ||
                    v === "SEBERANG_PERAI" ||
                    v === "GENERAL"
                  ) {
                    setSide(v);
                    setLocationId("");
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
                    <SelectItem value="SEBERANG_PERAI">Seberang Perai</SelectItem>
                  ) : null}
                  {sidesAvailable.includes("GENERAL") ? (
                    <SelectItem value="GENERAL">General</SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label>Location</Label>
            {filteredLocations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No open location at this jetty.
              </p>
            ) : (
              <Select value={locationId} onValueChange={(v) => v && setLocationId(v)}>
                <SelectTrigger className="min-h-11 w-full">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {filteredLocations.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      #{t.number} · {t.name}
                      {isBridgeStyle ? ` · ${sideLabel(t.side)}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="space-y-3">
          {availableBoats.length === 0 ? (
            <Alert>
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
                }}
                className={`flex w-full min-h-14 flex-col items-start rounded-md border px-4 py-3 text-left ${
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

      {step === 5 && boat && (
        <BoatSeatMap
          seats={boat.seats}
          takenIds={takenIds}
          partySize={partySize}
          selectedIds={selectedSeats}
          onChange={setSelectedSeats}
          boatName={boat.name}
        />
      )}

      {step === 6 && bookingId && (
        <section className="space-y-4 border-t border-border pt-5">
          <h2 className="text-lg font-semibold tracking-tight">Mock payment</h2>
          <p className="text-sm text-muted-foreground">
            Demo gateway — no real charge. Confirms booking and issues an opaque
            boarding QR token.
          </p>
          <p className="text-2xl font-semibold">{formatMYR(totalCents)}</p>
          <Button
            className="min-h-12 w-full"
            onClick={pay}
            disabled={pending}
          >
            {pending ? "Processing…" : "Pay with mock gateway"}
          </Button>
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
          <Button className="min-h-11 flex-1" onClick={next} disabled={pending}>
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
