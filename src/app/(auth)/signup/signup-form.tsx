"use client";

import { useState, useTransition } from "react";
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

export function SignUpForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [photo, setPhoto] = useState<EkycCaptureResult | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!photo) {
      setError(
        "Identity photo is required. Take a live photo with your camera.",
      );
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
        dob: String(fd.get("dob") ?? "") || undefined,
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
        "relative flex min-h-dvh flex-col overflow-hidden",
      )}
    >
      <MarketingBackground />

      <header className="relative z-10 flex h-14 items-center justify-between px-4 sm:px-6 lg:px-10">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <BrandLogo size={32} className="h-8 w-8" priority />
          TiangPass
        </Link>
        <Link
          href="/login"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Sign in
        </Link>
      </header>

      <div className="relative z-10 flex flex-1 items-center px-4 py-8 sm:px-6 lg:px-10">
        <div className="mx-auto grid w-full max-w-5xl items-start gap-8 lg:grid-cols-2 lg:gap-14">
          <FishingScene className="max-w-[220px] lg:hidden" />
          <div className="hidden space-y-4 pt-4 lg:block">
            <div className="flex items-center gap-3">
              <BrandLogo size={64} className="h-16 w-16" />
              <p className="font-[family-name:var(--font-display-landing)] text-4xl font-semibold tracking-tight text-[oklch(0.22_0.045_255)]">
                TiangPass
              </p>
            </div>
            <p className="max-w-sm text-muted-foreground">
              Register as a Malaysian angler (14+) to buy a same-day Association
              fishing pass under authorised bridge pillars.
            </p>
            <FishingScene className="max-w-md" />
          </div>

          <div className="w-full rounded-xl border border-border/80 bg-background/80 p-6 shadow-sm backdrop-blur-sm sm:p-8">
            <div className="mb-6 space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">
                Angler sign up
              </h1>
              <p className="text-sm text-muted-foreground">
                Malaysian citizens aged 14 and above. MyDigitalID optional later.
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="name" label="Full name" required />
                <Field id="email" label="Email" type="email" required />
                <Field id="phone" label="Mobile" type="tel" required />
                <Field
                  id="emergencyContactName"
                  label="Emergency contact name"
                  required
                />
                <Field
                  id="emergencyContact"
                  label="Emergency contact number"
                  type="tel"
                  required
                />
                <Field
                  id="myKad"
                  label="MyKad (12 digits)"
                  required
                  autoComplete="off"
                />
                <div className="space-y-2">
                  <Label htmlFor="citizenship">Citizenship</Label>
                  <select
                    id="citizenship"
                    name="citizenship"
                    required
                    defaultValue="MY"
                    className="flex min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  >
                    <option value="MY">Malaysian</option>
                    <option value="OTHER">Non-Malaysian (not allowed)</option>
                  </select>
                </div>
                <Field
                  id="dob"
                  label="Date of birth (optional if MyKad valid)"
                  type="date"
                />
                <Field
                  id="password"
                  label="Password"
                  type="password"
                  required
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <textarea
                  id="address"
                  name="address"
                  required
                  rows={2}
                  className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-3 rounded-lg border border-border/70 p-3">
                <Label>Identity photo (required)</Label>
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                  <div className="size-20 overflow-hidden rounded-full border border-border bg-muted">
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo.previewUrl}
                        alt="Captured identity"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                        No photo
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11"
                      onClick={() => setCameraOpen(true)}
                    >
                      {photo ? "Retake photo" : "Open camera"}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Align your face in the oval and snap. File upload is not
                      allowed.
                    </p>
                  </div>
                </div>
              </div>

              <label className="flex min-h-11 items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  name="acceptPolicy"
                  className="mt-1 size-4 accent-[var(--primary)]"
                  required
                />
                <span>
                  I agree to the{" "}
                  <Link
                    href="/policy"
                    className="text-primary underline-offset-4 hover:underline"
                    target="_blank"
                  >
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>
              <label className="flex min-h-11 items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  name="acceptPdpa"
                  className="mt-1 size-4 accent-[var(--primary)]"
                  required
                />
                <span>
                  I consent to PDPA processing of my identity data (
                  <Link
                    href="/consent"
                    className="text-primary underline-offset-4 hover:underline"
                    target="_blank"
                  >
                    notice
                  </Link>
                  ).
                </span>
              </label>
              <label className="flex min-h-11 items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  name="acceptLocation"
                  className="mt-1 size-4 accent-[var(--primary)]"
                  required
                />
                <span>
                  I consent to location capture to verify I am at the jetty when
                  buying a pass and during boarding.
                </span>
              </label>

              {error ? (
                <Alert variant="destructive">
                  <AlertTitle>Sign up failed</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <Button
                type="submit"
                className="min-h-11 w-full"
                disabled={pending}
              >
                {pending ? "Creating…" : "Create account"}
              </Button>
            </form>

            <p className="mt-4 text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-primary underline-offset-4 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      <EkycCameraCapture
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        onCapture={(result) => setPhoto(result)}
        title="Take identity photo"
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
