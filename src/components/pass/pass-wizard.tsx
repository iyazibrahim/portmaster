"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  actionCreatePass,
  actionMockPayFail,
  actionMockPaySuccess,
  actionStartHitPayCheckout,
} from "@/lib/actions/pass";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ASSOCIATION_FEE_CENTS,
  addCalendarDays,
  defaultExpectedReturnOn,
  formatMYR,
  sideLabel,
  todayMYT,
} from "@/lib/utils-app";
import { haversineMeters, parseCoord } from "@/lib/geo";
import { cn } from "@/lib/utils";
import {
  PaginationBar,
  useClientPagination,
} from "@/hooks/use-client-pagination";
import { CancelPassActions } from "@/components/pass/cancel-pass-actions";
import { useT } from "@/i18n/locale-provider";
import { canCancelPass } from "@/domain/pass";
import type { PassStatus } from "@/db/schema";

type JettyOption = {
  id: string;
  name: string;
  area: string | null;
  lat: string | null;
  lng: string | null;
  geofenceRadiusM: number;
};
type PillarOption = {
  id: string;
  name: string;
  number: number;
  side: string;
  remaining: number;
  held: number;
  maxOccupancy: number;
};

type Step = "jetty" | "pillar" | "pay";

type JettyAvailability = JettyOption & {
  distanceM: number | null;
  inRange: boolean;
};

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location is not available on this device."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 30_000,
    });
  });
}

function rankJetties(
  jetties: JettyOption[],
  device: { lat: number; lng: number } | null,
  bypass: boolean,
): JettyAvailability[] {
  const ranked = jetties.map((j) => {
    const jLat = parseCoord(j.lat);
    const jLng = parseCoord(j.lng);
    if (bypass) {
      return { ...j, distanceM: null, inRange: true };
    }
    if (!device || jLat == null || jLng == null) {
      return { ...j, distanceM: null, inRange: false };
    }
    const distanceM = haversineMeters(device.lat, device.lng, jLat, jLng);
    return {
      ...j,
      distanceM,
      inRange: distanceM <= j.geofenceRadiusM,
    };
  });
  return ranked.sort((a, b) => {
    if (a.inRange !== b.inRange) return a.inRange ? -1 : 1;
    const da = a.distanceM ?? Number.POSITIVE_INFINITY;
    const db = b.distanceM ?? Number.POSITIVE_INFINITY;
    return da - db;
  });
}

/** Match primary CTA height — default Button size is h-8. */
const actionBtn =
  "h-11 min-h-11 w-full shrink-0 px-4 text-sm sm:w-auto";

export function PassWizard({
  jetties,
  pillarsByJetty,
  todayPass,
  allowMultipleSameDay = false,
  bypassGeofence = false,
  hasIdentityPhoto = true,
  hitPayEnabled = false,
}: {
  jetties: JettyOption[];
  pillarsByJetty: Record<string, PillarOption[]>;
  todayPass: {
    id: string;
    status: string;
    reference: string;
    pillarName?: string | null;
    reservedUntil: string | null;
  } | null;
  allowMultipleSameDay?: boolean;
  bypassGeofence?: boolean;
  hasIdentityPhoto?: boolean;
  hitPayEnabled?: boolean;
}) {
  const { t } = useT();
  const router = useRouter();
  const [step, setStep] = useState<Step>(
    todayPass?.status === "PENDING_PAYMENT" ? "pay" : "jetty",
  );
  const [jettyId, setJettyId] = useState("");
  const [pillarId, setPillarId] = useState("");
  const [passId, setPassId] = useState<string | null>(
    todayPass?.status === "PENDING_PAYMENT" ? todayPass.id : null,
  );
  const [reservedUntil, setReservedUntil] = useState<string | null>(
    todayPass?.reservedUntil ?? null,
  );
  const [coords, setCoords] = useState<{ lat: string; lng: string } | null>(
    null,
  );
  const [locating, setLocating] = useState(!bypassGeofence);
  const [locationReady, setLocationReady] = useState(bypassGeofence);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const validOn = todayMYT();
  const [intendsOvernight, setIntendsOvernight] = useState(false);
  const [expectedReturnOn, setExpectedReturnOn] = useState(
    defaultExpectedReturnOn(validOn),
  );

  const rankedJetties = useMemo(() => {
    const device =
      coords != null
        ? { lat: Number(coords.lat), lng: Number(coords.lng) }
        : null;
    return rankJetties(jetties, device, bypassGeofence);
  }, [jetties, coords, bypassGeofence]);

  const jettyPager = useClientPagination(rankedJetties, 5);

  useEffect(() => {
    jettyPager.resetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when list identity changes
  }, [rankedJetties]);

  // Keep the selected jetty visible on its page after locate/refresh.
  useEffect(() => {
    if (!jettyId) return;
    const idx = rankedJetties.findIndex((j) => j.id === jettyId);
    if (idx < 0) return;
    const page = Math.floor(idx / 5);
    if (page !== jettyPager.page) jettyPager.setPage(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jettyId, rankedJetties]);

  const pillars = useMemo(
    () => (jettyId ? pillarsByJetty[jettyId] ?? [] : []),
    [jettyId, pillarsByJetty],
  );

  const selectedJetty = rankedJetties.find((j) => j.id === jettyId);

  useEffect(() => {
    if (bypassGeofence) {
      const id = window.setTimeout(() => {
        setLocating(false);
        setLocationReady(true);
        if (!jettyId && jetties[0]) setJettyId(jetties[0].id);
      }, 0);
      return () => window.clearTimeout(id);
    }

    let cancelled = false;
    const locateId = window.setTimeout(() => {
      if (cancelled) return;
      setLocating(true);
      void getPosition()
        .then((pos) => {
          if (cancelled) return;
          const next = {
            lat: String(pos.coords.latitude),
            lng: String(pos.coords.longitude),
          };
          setCoords(next);
          const ranked = rankJetties(
            jetties,
            { lat: pos.coords.latitude, lng: pos.coords.longitude },
            false,
          );
          const nearest = ranked.find((j) => j.inRange);
          if (nearest) {
            setJettyId(nearest.id);
          } else {
            setJettyId("");
            setError(
              "You need to be at a boarding jetty to buy a pass. Move closer and try again.",
            );
          }
          setLocationReady(true);
        })
        .catch((err: GeolocationPositionError | Error) => {
          if (cancelled) return;
          setCoords(null);
          setJettyId("");
          setLocationReady(true);
          const code =
            err && typeof err === "object" && "code" in err
              ? (err as GeolocationPositionError).code
              : null;
          if (code === 1) {
            setError(
              "Location permission is required to buy a pass. Enable location for this site, then tap Refresh location.",
            );
          } else {
            setError(
              "Turn on location so we can confirm you are at a boarding jetty, then tap Refresh location.",
            );
          }
        })
        .finally(() => {
          if (!cancelled) setLocating(false);
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(locateId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- locate once on mount
  }, [bypassGeofence]);

  if (
    todayPass &&
    !allowMultipleSameDay &&
    todayPass.status !== "PENDING_PAYMENT" &&
    todayPass.status !== "CANCELLED" &&
    todayPass.status !== "EXPIRED"
  ) {
    const canChange = canCancelPass(todayPass.status as PassStatus);
    return (
      <Card className="mx-auto w-full max-w-lg lg:max-w-xl">
        <CardHeader className="px-4 pt-4 sm:px-5 sm:pt-5">
          <CardTitle className="text-base">{t("pass.todayTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 pb-4 sm:px-5 sm:pb-5">
          <p className="text-sm text-muted-foreground">
            {t("pass.alreadyHave", { ref: todayPass.reference })}
          </p>
          {todayPass.pillarName ? (
            <p className="text-sm text-muted-foreground">
              {t("pass.alreadyHavePillar", { pillar: todayPass.pillarName })}
            </p>
          ) : null}
          <StatusBadge status={todayPass.status} className="w-fit" />
          {canChange ? (
            <>
              <p className="text-xs text-muted-foreground">
                {t("pass.changeBeforeBoard")}
              </p>
              <CancelPassActions
                passId={todayPass.id}
                status={todayPass.status}
                pillarName={todayPass.pillarName}
              />
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              {t("pass.changeBeforeBoard")}
            </p>
          )}
          <Button
            className={actionBtn}
            variant="outline"
            onClick={() => router.push(`/pass/${todayPass.id}`)}
          >
            {t("pass.viewQr")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  function goPillar() {
    if (!hasIdentityPhoto) {
      setError("Add your identity photo on Profile before buying a pass.");
      return;
    }
    if (!jettyId) {
      setError("Select a boarding jetty.");
      return;
    }
    if (!bypassGeofence && !coords) {
      setError(
        "Enable location to continue. You must be at the jetty to buy a pass.",
      );
      return;
    }
    if (!bypassGeofence && !selectedJetty?.inRange) {
      setError("You need to be at this jetty to continue.");
      return;
    }
    setError(null);
    setPillarId("");
    setStep("pillar");
  }

  function createAndPay() {
    if (!hasIdentityPhoto) {
      setError("Add your identity photo on Profile before buying a pass.");
      return;
    }
    if (!pillarId) {
      setError("Select a fishing pillar.");
      return;
    }
    if (!bypassGeofence && !coords) {
      setError(
        "Enable location to buy a pass. You must be at the jetty.",
      );
      return;
    }
    setError(null);
    startTransition(async () => {
      const jetty = jetties.find((j) => j.id === jettyId);
      const created = await actionCreatePass({
        jettyId,
        pillarId,
        lat: coords?.lat ?? jetty?.lat ?? undefined,
        lng: coords?.lng ?? jetty?.lng ?? undefined,
        intendsOvernight,
        expectedReturnOn: intendsOvernight ? expectedReturnOn : null,
      });
      if (!created.ok) {
        setError(created.error);
        return;
      }
      setPassId(created.passId);
      setReservedUntil(new Date(Date.now() + 10 * 60_000).toISOString());
      setStep("pay");
    });
  }

  function paySuccess() {
    if (!passId) return;
    startTransition(async () => {
      const result = await actionMockPaySuccess(passId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/pass/${passId}`);
    });
  }

  function payWithHitPay() {
    if (!passId) return;
    startTransition(async () => {
      const result = await actionStartHitPayCheckout(passId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (!result.checkoutUrl) {
        setError(t("pass.pay.hitpayMissingUrl"));
        return;
      }
      window.location.assign(result.checkoutUrl);
    });
  }

  function payFail() {
    if (!passId) return;
    startTransition(async () => {
      const result = await actionMockPayFail(passId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPassId(null);
      setStep("pillar");
      setError(t("pass.pay.failedRetry"));
      router.refresh();
    });
  }

  function refreshLocation() {
    setError(null);
    setLocating(true);
    void getPosition()
      .then((pos) => {
        setCoords({
          lat: String(pos.coords.latitude),
          lng: String(pos.coords.longitude),
        });
        const ranked = rankJetties(
          jetties,
          { lat: pos.coords.latitude, lng: pos.coords.longitude },
          false,
        );
        const nearest = ranked.find((j) => j.inRange);
        setJettyId(nearest?.id ?? "");
        if (!nearest) {
          setError(
            "You need to be at a boarding jetty to buy a pass. Move closer and try again.",
          );
        }
      })
      .catch(() => {
        setError(
          "Location permission is required to buy a pass. Enable location, then try again.",
        );
      })
      .finally(() => setLocating(false));
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-4 lg:max-w-xl">
      {!hasIdentityPhoto ? (
        <Alert>
          <AlertTitle>Identity photo required</AlertTitle>
          <AlertDescription>
            Take your e-KYC photo on{" "}
            <button
              type="button"
              className="font-medium text-primary underline-offset-4 hover:underline"
              onClick={() => router.push("/profile")}
            >
              Profile
            </button>{" "}
            before purchasing a pass.
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-wrap gap-2 text-xs">
        {(
          [
            ["jetty", "1. Jetty"],
            ["pillar", "2. Pillar"],
            ["pay", "3. Pay RM5"],
          ] as const
        ).map(([key, label]) => (
          <Badge
            key={key}
            variant={step === key ? "default" : "secondary"}
            className={cn(step === key && "bg-primary")}
          >
            {label}
          </Badge>
        ))}
      </div>

      {allowMultipleSameDay || bypassGeofence ? (
        <p className="text-xs text-muted-foreground">
          Demo account: testing shortcuts enabled (multi-pass
          {bypassGeofence ? ", any jetty" : ""}).
        </p>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Cannot continue</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {step === "jetty" ? (
        <Card>
          <CardHeader>
            <CardTitle>Select boarding jetty</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Buy your pass at the jetty. Boat hire is arranged outside
              TiangPass.
            </p>
            {locating ? (
              <p className="text-sm text-muted-foreground">
                Finding nearby jetties…
              </p>
            ) : null}
            <div className="space-y-2">
              {jettyPager.pageItems.map((j) => {
                const disabled = !bypassGeofence && !j.inRange;
                const availability = bypassGeofence
                  ? "AVAILABLE"
                  : j.inRange
                    ? "HERE"
                    : "UNAVAILABLE";
                const availabilityLabel = bypassGeofence
                  ? "Available"
                  : j.inRange
                    ? "Here"
                    : "Unavailable";
                return (
                  <button
                    key={j.id}
                    type="button"
                    disabled={disabled || locating}
                    onClick={() => {
                      setJettyId(j.id);
                      setError(null);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-3 text-left text-sm",
                      jettyId === j.id
                        ? "border-primary bg-primary/5"
                        : "border-border",
                      disabled && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block font-medium">{j.name}</span>
                      {j.area ? (
                        <span className="text-xs text-muted-foreground">
                          {j.area}
                        </span>
                      ) : null}
                    </span>
                    <StatusBadge
                      status={availability}
                      label={availabilityLabel}
                      className="shrink-0"
                    />
                  </button>
                );
              })}
            </div>
            <PaginationBar
              page={jettyPager.page}
              pageCount={jettyPager.pageCount}
              total={jettyPager.total}
              canPrev={jettyPager.canPrev}
              canNext={jettyPager.canNext}
              onPrev={jettyPager.goPrev}
              onNext={jettyPager.goNext}
            />
            {!bypassGeofence && locationReady && !locating ? (
              <Button
                type="button"
                variant="ghost"
                className="h-11 px-0 text-sm text-muted-foreground"
                onClick={refreshLocation}
              >
                Refresh nearby jetties
              </Button>
            ) : null}
            <Button
              className={actionBtn}
              onClick={goPillar}
              disabled={
                pending ||
                locating ||
                !jettyId ||
                (!bypassGeofence && !selectedJetty?.inRange)
              }
            >
              Continue
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {step === "pillar" ? (
        <Card>
          <CardHeader>
            <CardTitle>Pick one fishing pillar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              One pillar per pass. Capacity is set by Association per pillar.
            </p>
            <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {pillars.map((p) => {
                const full = p.remaining <= 0;
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={full}
                    onClick={() => setPillarId(p.id)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg border px-3 py-3 text-left text-sm",
                      pillarId === p.id
                        ? "border-primary bg-primary/5"
                        : "border-border",
                      full && "opacity-50",
                    )}
                  >
                    <span>
                      {p.name}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {sideLabel(p.side)}
                      </span>
                    </span>
                    <Badge variant={full ? "destructive" : "secondary"}>
                      {p.held}/{p.maxOccupancy} · {p.remaining} left
                    </Badge>
                  </button>
                );
              })}
            </div>
            <div className="space-y-3 rounded-lg border border-border/80 p-3">
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1 size-4 accent-primary"
                  checked={intendsOvernight}
                  onChange={(e) => {
                    setIntendsOvernight(e.target.checked);
                    if (e.target.checked) {
                      setExpectedReturnOn(defaultExpectedReturnOn(validOn));
                    }
                  }}
                />
                <span>
                  <span className="font-medium">{t("pass.wizard.overnight")}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {t("pass.wizard.overnightHint")}
                  </span>
                </span>
              </label>
              {intendsOvernight ? (
                <div className="space-y-1.5 pl-6">
                  <label
                    className="text-xs font-medium text-muted-foreground"
                    htmlFor="wizard-return-on"
                  >
                    {t("pass.wizard.returnDate")}
                  </label>
                  <input
                    id="wizard-return-on"
                    type="date"
                    min={addCalendarDays(validOn, 1)}
                    max={addCalendarDays(validOn, 3)}
                    value={expectedReturnOn}
                    onChange={(e) => setExpectedReturnOn(e.target.value)}
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                  />
                </div>
              ) : null}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[auto_1fr]">
              <Button
                type="button"
                variant="outline"
                className={actionBtn}
                onClick={() => setStep("jetty")}
              >
                Back
              </Button>
              <Button
                type="button"
                className={cn(actionBtn, "sm:w-full")}
                onClick={createAndPay}
                disabled={pending || !pillarId}
              >
                {pending
                  ? "Reserving…"
                  : `Reserve & pay ${formatMYR(ASSOCIATION_FEE_CENTS)}`}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === "pay" && passId ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("pass.pay.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("pass.pay.amount", {
                amount: formatMYR(ASSOCIATION_FEE_CENTS),
              })}
              {reservedUntil
                ? ` · ${t("pass.pay.reservedUntil", {
                    time: new Date(reservedUntil).toLocaleTimeString(),
                  })}`
                : null}
            </p>
            {hitPayEnabled ? (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">
                  {t("pass.pay.hitpayHint")}
                </p>
                <Button
                  className={actionBtn}
                  onClick={payWithHitPay}
                  disabled={pending}
                >
                  {pending ? t("pass.pay.redirecting") : t("pass.pay.hitpayCta")}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  className={actionBtn}
                  onClick={paySuccess}
                  disabled={pending}
                >
                  {pending ? t("pass.pay.processing") : t("pass.pay.mockSuccess")}
                </Button>
                <Button
                  variant="outline"
                  className={actionBtn}
                  onClick={payFail}
                  disabled={pending}
                >
                  {t("pass.pay.mockFail")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
