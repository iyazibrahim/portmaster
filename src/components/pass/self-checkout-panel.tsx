"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  actionSelfCheckOut,
  actionUpdateOvernightIntention,
} from "@/lib/actions/pass";
import {
  addCalendarDays,
  defaultExpectedReturnOn,
} from "@/lib/utils-app";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useT } from "@/i18n/locale-provider";

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location is not available on this device."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15_000,
      maximumAge: 30_000,
    });
  });
}

/** Compact trigger + modal — keeps pass detail uncluttered. */
export function OvernightIntentionPanel({
  passId,
  status,
  validOn,
  intendsOvernight,
  expectedReturnOn,
}: {
  passId: string;
  status: string;
  validOn: string;
  intendsOvernight: boolean;
  expectedReturnOn: string | null;
}) {
  const { t } = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [overnight, setOvernight] = useState(intendsOvernight);
  const [returnOn, setReturnOn] = useState(
    expectedReturnOn ?? defaultExpectedReturnOn(validOn),
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (status !== "ACTIVE" && status !== "CHECKED_IN") return null;

  const maxDate = addCalendarDays(validOn, 3);
  const minDate = addCalendarDays(validOn, 1);

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await actionUpdateOvernightIntention({
        passId,
        intendsOvernight: overnight,
        expectedReturnOn: overnight ? returnOn : null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
      router.refresh();
      setOpen(false);
    });
  }

  const summary = intendsOvernight
    ? t("pass.overnight.summaryOn", {
        date: expectedReturnOn ?? "—",
      })
    : t("pass.overnight.summaryOff");

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="min-h-11 w-full justify-between gap-3 px-4 text-left sm:w-auto"
        onClick={() => {
          setOvernight(intendsOvernight);
          setReturnOn(expectedReturnOn ?? defaultExpectedReturnOn(validOn));
          setError(null);
          setSaved(false);
          setOpen(true);
        }}
      >
        <span className="min-w-0 truncate font-medium">
          {t("pass.overnight.open")}
        </span>
        <span className="shrink-0 text-xs font-normal text-muted-foreground">
          {summary}
        </span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("pass.overnight.title")}</DialogTitle>
            <DialogDescription className="text-left">
              {t("pass.overnight.hint")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1 size-4 accent-primary"
                checked={overnight}
                onChange={(e) => {
                  setOvernight(e.target.checked);
                  setSaved(false);
                  if (e.target.checked && !returnOn) {
                    setReturnOn(defaultExpectedReturnOn(validOn));
                  }
                }}
              />
              <span>{t("pass.overnight.checkbox")}</span>
            </label>
            {overnight ? (
              <div className="space-y-1.5">
                <Label htmlFor={`return-${passId}`}>
                  {t("pass.overnight.returnDate")}
                </Label>
                <input
                  id={`return-${passId}`}
                  type="date"
                  min={minDate}
                  max={maxDate}
                  value={returnOn}
                  onChange={(e) => {
                    setReturnOn(e.target.value);
                    setSaved(false);
                  }}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>
            ) : null}
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            {saved ? (
              <p className="text-xs text-emerald-700">
                {t("pass.overnight.saved")}
              </p>
            ) : null}
          </div>
          <DialogFooter className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              className="min-h-11"
              disabled={pending}
              onClick={save}
            >
              {pending ? t("pass.overnight.saving") : t("pass.overnight.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function SelfCheckoutPanel({
  passId,
  status,
  expectedReturnOn,
  remind,
}: {
  passId: string;
  status: string;
  expectedReturnOn: string | null;
  remind: boolean;
}) {
  const { t } = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [declared, setDeclared] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status !== "CHECKED_IN") return null;

  function checkOut() {
    setError(null);
    if (!declared) {
      setError(t("pass.selfCheckout.needDeclaration"));
      return;
    }
    startTransition(async () => {
      try {
        const pos = await getPosition();
        const result = await actionSelfCheckOut({
          passId,
          lat: String(pos.coords.latitude),
          lng: String(pos.coords.longitude),
          shoreDeclarationAccepted: true,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        router.refresh();
      } catch (err) {
        const code =
          err && typeof err === "object" && "code" in err
            ? (err as GeolocationPositionError).code
            : null;
        if (code === 1) {
          setError(t("pass.selfCheckout.gpsDenied"));
        } else {
          setError(
            err instanceof Error ? err.message : t("pass.selfCheckout.gpsError"),
          );
        }
      }
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <div>
        <p className="text-sm font-medium">{t("pass.selfCheckout.title")}</p>
        <p className="text-xs text-muted-foreground">
          {t("pass.selfCheckout.hint")}
        </p>
        {expectedReturnOn ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {t("pass.selfCheckout.expectedReturn", { date: expectedReturnOn })}
          </p>
        ) : null}
      </div>

      {remind ? (
        <Alert>
          <AlertTitle>{t("pass.selfCheckout.remindTitle")}</AlertTitle>
          <AlertDescription>
            {t("pass.selfCheckout.remindBody")}
          </AlertDescription>
        </Alert>
      ) : null}

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-1 size-4 accent-primary"
          checked={declared}
          onChange={(e) => setDeclared(e.target.checked)}
        />
        <span>{t("pass.selfCheckout.declaration")}</span>
      </label>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>{t("pass.selfCheckout.errorTitle")}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Button
        type="button"
        className="h-11 min-h-11 w-full"
        disabled={pending || !declared}
        onClick={checkOut}
      >
        {pending
          ? t("pass.selfCheckout.checkingOut")
          : t("pass.selfCheckout.cta")}
      </Button>
      <p className="text-xs text-muted-foreground">
        {t("pass.selfCheckout.operatorFallback")}
      </p>
    </div>
  );
}
