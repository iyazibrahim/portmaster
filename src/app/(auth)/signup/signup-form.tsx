"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Newsreader } from "next/font/google";
import { signUpAngler, loginWithCredentials } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MarketingBackground } from "@/components/layout/marketing-background";
import { FishingScene } from "@/components/layout/fishing-scene";
import { BrandLogo } from "@/components/brand-logo";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { useT } from "@/i18n/locale-provider";
import {
  EkycCameraCapture,
  type EkycCaptureResult,
} from "@/components/profile/ekyc-camera-capture";
import { cn } from "@/lib/utils";

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-display-landing",
  display: "swap",
});

const MIN_AGE = 14;

/** Client-safe MyKad / age helpers (mirror server utils). */
function normalizeMyKad(raw: string) {
  return raw.replace(/[\s-]/g, "").toUpperCase();
}

function parseMyKadDob(raw: string): string | null {
  const n = normalizeMyKad(raw);
  if (!/^\d{12}$/.test(n)) return null;
  const yy = Number(n.slice(0, 2));
  const mm = Number(n.slice(2, 4));
  const dd = Number(n.slice(4, 6));
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  const year = yy <= 30 ? 2000 + yy : 1900 + yy;
  return `${year.toString().padStart(4, "0")}-${mm.toString().padStart(2, "0")}-${dd.toString().padStart(2, "0")}`;
}

function todayMYT(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function ageFromDob(dob: string, onDate = todayMYT()): number {
  const [y, m, d] = dob.split("-").map(Number);
  const [cy, cm, cd] = onDate.split("-").map(Number);
  let age = cy - y;
  if (cm < m || (cm === m && cd < d)) age -= 1;
  return age;
}

export function SignUpForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [photo, setPhoto] = useState<EkycCaptureResult | null>(null);
  const [myKad, setMyKad] = useState("");
  const [dob, setDob] = useState("");
  const { t, locale } = useT();

  const policyParts = useMemo(
    () => t("auth.acceptPolicy").split("{policy}"),
    [t],
  );
  const pdpaParts = useMemo(
    () => t("auth.acceptPdpa").split("{notice}"),
    [t],
  );

  const ageCheck = useMemo(() => {
    const fromIc = parseMyKadDob(myKad);
    const effectiveDob = dob.trim() || fromIc || null;
    if (!effectiveDob) {
      return { status: "unknown" as const, age: null as number | null, dob: null as string | null };
    }
    const age = ageFromDob(effectiveDob);
    if (age < MIN_AGE) {
      return { status: "blocked" as const, age, dob: effectiveDob };
    }
    return { status: "ok" as const, age, dob: effectiveDob };
  }, [myKad, dob]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!photo) {
      setError(t("auth.photoRequired"));
      return;
    }
    if (ageCheck.status === "blocked") {
      setError(
        t("auth.blockedAge", { min: MIN_AGE, age: ageCheck.age ?? "?" }),
      );
      return;
    }
    if (ageCheck.status === "unknown") {
      setError(t("auth.ageUnknown"));
      return;
    }

    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const payload = {
        name: String(fd.get("name") ?? ""),
        email: String(fd.get("email") ?? ""),
        phone: String(fd.get("phone") ?? ""),
        emergencyContact: String(fd.get("emergencyContact") ?? ""),
        emergencyContactName: String(fd.get("emergencyContactName") ?? ""),
        address: String(fd.get("address") ?? ""),
        myKad: String(fd.get("myKad") ?? ""),
        citizenship: String(fd.get("citizenship") ?? "MY"),
        dob: ageCheck.dob ?? undefined,
        password: String(fd.get("password") ?? ""),
        acceptPolicy: fd.get("acceptPolicy") === "on",
        acceptPdpa: fd.get("acceptPdpa") === "on",
        acceptLocation: fd.get("acceptLocation") === "on",
        photoBase64: photo.base64,
        photoMimeType: photo.mimeType,
      };

      const result = await signUpAngler(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const login = await loginWithCredentials(
        payload.email,
        payload.password,
      );
      if (!login.ok) {
        setError(login.error);
        return;
      }
      window.location.assign(login.redirectTo);
    });
  }

  return (
    <main
      className={cn(
        newsreader.variable,
        "relative flex min-h-dvh flex-col overflow-x-hidden",
      )}
    >
      <MarketingBackground />

      <header className="relative z-10 flex h-14 shrink-0 items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2 text-sm font-semibold tracking-tight"
        >
          <BrandLogo size={32} className="h-8 w-8 shrink-0" priority />
          TiangPass
        </Link>
        <div className="flex shrink-0 items-center gap-3 sm:gap-4">
          <LocaleSwitcher locale={locale} />
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {t("auth.loginLink")}
          </Link>
        </div>
      </header>

      <div className="relative z-10 flex flex-1 items-start px-4 py-6 sm:px-6 sm:py-8 lg:items-center lg:px-10 lg:py-10">
        <div className="mx-auto grid w-full max-w-6xl items-start gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.15fr)] lg:gap-12 xl:gap-16">
          <FishingScene className="mx-auto max-w-[200px] lg:hidden" />
          <div className="hidden space-y-5 lg:sticky lg:top-8 lg:block lg:self-start">
            <div className="flex items-center gap-3">
              <BrandLogo size={64} className="h-16 w-16 shrink-0" />
              <p className="font-[family-name:var(--font-display-landing)] text-4xl font-semibold tracking-tight text-[oklch(0.22_0.045_255)]">
                TiangPass
              </p>
            </div>
            <p className="max-w-md text-base leading-relaxed text-muted-foreground">
              {t("auth.signupHero", { min: MIN_AGE })}
            </p>
            <FishingScene className="max-w-md" />
          </div>

          <div className="w-full rounded-xl border border-border/80 bg-background/90 p-5 shadow-sm backdrop-blur-sm sm:p-7 lg:p-8">
            <div className="mb-6 space-y-1.5">
              <h1 className="text-2xl font-semibold tracking-tight">
                {t("auth.signupTitle")}
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t("auth.signupSub", { min: MIN_AGE })}
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                <Field id="name" label={t("auth.name")} required />
                <Field id="email" label={t("auth.email")} type="email" required />
                <Field id="phone" label={t("auth.mobile")} type="tel" required />
                <Field
                  id="emergencyContactName"
                  label={t("auth.emergencyName")}
                  required
                />
                <Field
                  id="emergencyContact"
                  label={t("auth.emergencyPhone")}
                  type="tel"
                  required
                />
                <div className="space-y-2">
                  <Label htmlFor="myKad">{t("auth.myKad")}</Label>
                  <Input
                    id="myKad"
                    name="myKad"
                    required
                    autoComplete="off"
                    inputMode="numeric"
                    maxLength={14}
                    value={myKad}
                    onChange={(e) => setMyKad(e.target.value)}
                    className="min-h-11"
                    placeholder={t("auth.myKadPlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="citizenship">{t("auth.citizenship")}</Label>
                  <select
                    id="citizenship"
                    name="citizenship"
                    required
                    defaultValue="MY"
                    className="flex min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  >
                    <option value="MY">{t("auth.citizenshipMY")}</option>
                    <option value="OTHER">{t("auth.citizenshipOther")}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dob">
                    {t("auth.dob")}
                    <span className="font-normal text-muted-foreground">
                      {" "}
                      {t("auth.dobHint")}
                    </span>
                  </Label>
                  <Input
                    id="dob"
                    name="dob"
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="min-h-11"
                    max={todayMYT()}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="password">{t("auth.password")}</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    autoComplete="new-password"
                    minLength={8}
                    className="min-h-11"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("auth.passwordHint")}
                  </p>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address">{t("auth.address")}</Label>
                  <textarea
                    id="address"
                    name="address"
                    required
                    rows={3}
                    className="flex min-h-[5.5rem] w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm"
                  />
                </div>
              </div>

              {ageCheck.status === "blocked" ? (
                <Alert variant="destructive">
                  <AlertTitle>{t("auth.underAgeTitle")}</AlertTitle>
                  <AlertDescription>
                    {t("auth.underAgeBody", {
                      min: MIN_AGE,
                      source: dob.trim()
                        ? t("auth.ageSourceDob")
                        : t("auth.ageSourceMyKad"),
                      age: ageCheck.age ?? "?",
                    })}
                  </AlertDescription>
                </Alert>
              ) : ageCheck.status === "ok" ? (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100">
                  {t("auth.ageOk", {
                    age: ageCheck.age ?? "?",
                    min: MIN_AGE,
                  })}
                </p>
              ) : myKad.trim().length > 0 ? (
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  {t("auth.ageNeed", { min: MIN_AGE })}
                </p>
              ) : null}

              <div className="space-y-3 rounded-lg border border-border/70 p-4">
                <Label>{t("auth.photoLabel")}</Label>
                <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                  <div className="size-24 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo.previewUrl}
                        alt="Captured identity"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                        {t("auth.noPhoto")}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11"
                      onClick={() => setCameraOpen(true)}
                    >
                      {photo ? t("auth.retakePhoto") : t("auth.openCamera")}
                    </Button>
                    <p className="max-w-sm text-xs text-muted-foreground">
                      {t("auth.photoHint")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-start gap-3 text-sm leading-snug">
                  <input
                    type="checkbox"
                    name="acceptPolicy"
                    className="mt-1 size-4 shrink-0 accent-[var(--primary)]"
                    required
                  />
                  <span>
                    {policyParts[0]}
                    <Link
                      href="/policy"
                      className="text-primary underline-offset-4 hover:underline"
                      target="_blank"
                    >
                      {t("auth.privacyPolicy")}
                    </Link>
                    {policyParts[1] ?? ""}
                  </span>
                </label>
                <label className="flex items-start gap-3 text-sm leading-snug">
                  <input
                    type="checkbox"
                    name="acceptPdpa"
                    className="mt-1 size-4 shrink-0 accent-[var(--primary)]"
                    required
                  />
                  <span>
                    {pdpaParts[0]}
                    <Link
                      href="/consent"
                      className="text-primary underline-offset-4 hover:underline"
                      target="_blank"
                    >
                      {t("auth.pdpaNotice")}
                    </Link>
                    {pdpaParts[1] ?? ""}
                  </span>
                </label>
                <label className="flex items-start gap-3 text-sm leading-snug">
                  <input
                    type="checkbox"
                    name="acceptLocation"
                    className="mt-1 size-4 shrink-0 accent-[var(--primary)]"
                    required
                  />
                  <span>{t("auth.acceptLocation")}</span>
                </label>
              </div>

              {error ? (
                <Alert variant="destructive">
                  <AlertTitle>{t("auth.signupFailed")}</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <Button
                type="submit"
                className="min-h-11 w-full"
                disabled={pending || ageCheck.status === "blocked"}
              >
                {pending ? t("auth.creating") : t("auth.submitSignup")}
              </Button>
            </form>

            <p className="mt-5 text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-primary underline-offset-4 hover:underline"
              >
                {t("auth.loginLink")}
              </Link>
            </p>
          </div>
        </div>
      </div>

      <EkycCameraCapture
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        onCapture={(result) => setPhoto(result)}
        title={t("auth.cameraTitle")}
      />
    </main>
  );
}

function Field({
  id,
  label,
  type = "text",
  required,
  autoComplete,
}: {
  id: string;
  label: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        type={type}
        required={required}
        autoComplete={autoComplete}
        className="min-h-11"
      />
    </div>
  );
}
