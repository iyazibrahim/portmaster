"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { KeyRound } from "lucide-react";
import Link from "next/link";
import { signUpAngler, loginWithCredentials } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MarketingBackground } from "@/components/layout/marketing-background";
import { FishingScene } from "@/components/layout/fishing-scene";
import { BrandLogo } from "@/components/brand-logo";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { KeyboardSafeForm } from "@/components/ux/keyboard-safe-form";
import { BusyLabel } from "@/components/ux/action-spinner";
import { useT } from "@/i18n/locale-provider";
import {
  EkycCameraCapture,
  type EkycCaptureResult,
} from "@/components/profile/ekyc-camera-capture";
import { PasswordWithStrengthFields } from "@/components/auth/password-with-strength-fields";
import {
  AboutFields,
  AddressFields,
  PhotoFields,
} from "@/components/auth/signup-sections";
import {
  getPasswordChecks,
  passwordChecksOk,
} from "@/lib/password-policy";
import {
  type AddressErrorCode,
  validateMalaysianAddress,
} from "@/lib/my-address";
import { isValidEmail } from "@/lib/email";
import { ageFromDob, todayMYT } from "@/lib/calendar";
import { formatMyKad, normalizeMyKad, parseMyKadDobPrefix } from "@/lib/my-kad";
import { cn } from "@/lib/utils";

const MIN_AGE = 14;
const STEPS = ["about", "address", "password", "photo"] as const;

function phoneOk(raw: string) {
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 15;
}

export function SignUpForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [photo, setPhoto] = useState<EkycCaptureResult | null>(null);
  const [step, setStep] = useState(0);
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [phone, setPhone] = useState("");
  const [myKad, setMyKad] = useState("");
  const [citizenship, setCitizenship] = useState("MY");
  const [dob, setDob] = useState("");
  const [unit, setUnit] = useState("");
  const [street, setStreet] = useState("");
  const [postcode, setPostcode] = useState("");
  const [stateId, setStateId] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptPolicy, setAcceptPolicy] = useState(false);
  const [acceptPdpa, setAcceptPdpa] = useState(false);
  const [acceptLocation, setAcceptLocation] = useState(false);
  const { t, locale } = useT();

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const apply = () => setIsDesktop(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  const ageCheck = useMemo(() => {
    const fromIc = parseMyKadDobPrefix(myKad);
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

  const stepTitles = [
    t("auth.stepAbout"),
    t("auth.stepAddress"),
    t("auth.stepPassword"),
    t("auth.stepPhoto"),
  ];

  function addressError(code: AddressErrorCode) {
    switch (code) {
      case "unit":
        return t("auth.addressUnitRequired");
      case "street":
        return t("auth.addressStreetRequired");
      case "postcode":
        return t("auth.addressPostcodeInvalid");
      case "state":
        return t("auth.addressStateRequired");
      case "postcode_state":
        return t("auth.addressPostcodeState");
    }
  }

  function validateAbout() {
    if (name.trim().length < 2) return t("auth.nameRequired");
    if (!isValidEmail(email)) {
      setEmailTouched(true);
      return t("auth.emailInvalid");
    }
    if (!phoneOk(phone)) return t("auth.phoneInvalid");
    if (!/^\d{12}$/.test(normalizeMyKad(myKad))) return t("auth.ageNeed", { min: MIN_AGE });
    if (citizenship !== "MY") return t("auth.citizenshipBlocked");
    if (ageCheck.status === "blocked") {
      return t("auth.blockedAge", { min: MIN_AGE, age: ageCheck.age ?? "?" });
    }
    if (ageCheck.status === "unknown") return t("auth.ageUnknown");
    return null;
  }

  function validateAddress() {
    const address = validateMalaysianAddress({
      unit,
      street,
      postcode,
      stateId,
    });
    if (!address.ok) return addressError(address.code);
    if (emergencyName.trim().length < 2) return t("auth.emergencyNameRequired");
    if (!phoneOk(emergencyPhone)) return t("auth.emergencyPhoneInvalid");
    return null;
  }

  function validatePassword() {
    if (!passwordChecksOk(getPasswordChecks(password))) return t("auth.passwordHint");
    if (password !== confirmPassword) return t("auth.passwordMismatch");
    return null;
  }

  function validatePhoto() {
    if (!photo) return t("auth.photoRequired");
    if (!acceptPolicy || !acceptPdpa || !acceptLocation) {
      return t("auth.consentRequired");
    }
    return null;
  }

  const validators = [validateAbout, validateAddress, validatePassword, validatePhoto];

  function goNext() {
    const message = validators[step]();
    setError(message);
    if (!message) setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  function goBack() {
    setError(null);
    setStep((current) => Math.max(current - 1, 0));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isDesktop && step < STEPS.length - 1) {
      goNext();
      return;
    }

    for (const validate of validators) {
      const message = validate();
      if (message) {
        setError(message);
        return;
      }
    }
    if (!photo || !ageCheck.dob) return;

    setError(null);
    startTransition(async () => {
      const result = await signUpAngler({
        name,
        email,
        phone,
        emergencyContact: emergencyPhone,
        emergencyContactName: emergencyName,
        addressUnit: unit,
        addressStreet: street,
        addressPostcode: postcode,
        addressState: stateId,
        myKad,
        citizenship,
        dob: ageCheck.dob ?? undefined,
        password,
        acceptPolicy,
        acceptPdpa,
        acceptLocation,
        photoBase64: photo.base64,
        photoMimeType: photo.mimeType,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const login = await loginWithCredentials(email, password);
      if (!login.ok) {
        setError(login.error);
        return;
      }
      window.location.assign(login.redirectTo);
    });
  }

  const ageNotice =
    ageCheck.status === "blocked" ? (
      <Alert variant="destructive">
        <AlertTitle>{t("auth.underAgeTitle")}</AlertTitle>
        <AlertDescription>
          {t("auth.underAgeBody", {
            min: MIN_AGE,
            source: dob.trim() ? t("auth.ageSourceDob") : t("auth.ageSourceMyKad"),
            age: ageCheck.age ?? "?",
          })}
        </AlertDescription>
      </Alert>
    ) : ageCheck.status === "ok" ? (
      <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs leading-normal text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100">
        {t("auth.ageOk", { age: ageCheck.age ?? "?", min: MIN_AGE })}
      </p>
    ) : myKad.trim().length > 0 ? (
      <p className="text-xs leading-normal text-amber-800 dark:text-amber-200">
        {t("auth.ageNeed", { min: MIN_AGE })}
      </p>
    ) : null;

  const about = (
    <AboutFields
      columns={isDesktop === true}
      name={name}
      email={email}
      phone={phone}
      myKad={myKad}
      citizenship={citizenship}
      dob={dob}
      maxDob={todayMYT()}
      onName={setName}
      onEmail={setEmail}
      onEmailBlur={() => setEmailTouched(true)}
      emailError={
        (emailTouched || email.includes("@")) && !isValidEmail(email)
          ? t("auth.emailInvalid")
          : null
      }
      onPhone={setPhone}
      onMyKad={(value) => {
        const formatted = formatMyKad(value);
        const previousDob = parseMyKadDobPrefix(myKad);
        const nextDob = parseMyKadDobPrefix(formatted);
        setMyKad(formatted);
        if (nextDob && nextDob !== previousDob) setDob(nextDob);
      }}
      onCitizenship={setCitizenship}
      onDob={setDob}
      ageNotice={ageNotice}
    />
  );
  const address = (
    <AddressFields
      columns={isDesktop === true}
      unit={unit}
      street={street}
      postcode={postcode}
      stateId={stateId}
      emergencyName={emergencyName}
      emergencyPhone={emergencyPhone}
      onUnit={setUnit}
      onStreet={setStreet}
      onPostcode={setPostcode}
      onState={setStateId}
      onEmergencyName={setEmergencyName}
      onEmergencyPhone={setEmergencyPhone}
    />
  );
  const passwordFields = (
    <PasswordWithStrengthFields
      password={password}
      confirmPassword={confirmPassword}
      onPasswordChange={setPassword}
      onConfirmChange={setConfirmPassword}
    />
  );
  const photoFields = (
    <PhotoFields
      photo={photo}
      acceptPolicy={acceptPolicy}
      acceptPdpa={acceptPdpa}
      acceptLocation={acceptLocation}
      onOpenCamera={() => setCameraOpen(true)}
      onAcceptPolicy={setAcceptPolicy}
      onAcceptPdpa={setAcceptPdpa}
      onAcceptLocation={setAcceptLocation}
    />
  );

  const errorAlert = error ? (
    <Alert variant="destructive">
      <AlertTitle>{t("auth.signupFailed")}</AlertTitle>
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  ) : null;

  return (
    <main className="relative flex min-h-dvh flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain">
      <MarketingBackground />

      <header className="relative z-10 flex min-h-14 shrink-0 items-center justify-between gap-2 px-4 pt-[env(safe-area-inset-top)] sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2 py-2 text-sm font-semibold tracking-tight"
        >
          <BrandLogo size={32} className="h-8 w-8 shrink-0" priority />
          TiangPass
        </Link>
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <LocaleSwitcher locale={locale} />
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground"
          >
            {t("auth.loginLink")}
          </Link>
        </div>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.15fr)] lg:items-start lg:gap-8">
          <div className="hidden space-y-4 lg:sticky lg:top-8 lg:block lg:self-start">
            <div className="flex items-center gap-4">
              <BrandLogo size={64} className="h-16 w-16 shrink-0" />
              <p className="font-display text-3xl font-semibold tracking-tight text-[oklch(0.22_0.045_255)]">
                TiangPass
              </p>
            </div>
            <p className="max-w-md text-base leading-normal text-muted-foreground">
              {t("auth.signupHero", { min: MIN_AGE })}
            </p>
            <FishingScene className="max-w-md" />
          </div>

          <div className="flex w-full flex-1 flex-col rounded-xl border border-border/80 bg-background/90 p-4 shadow-sm backdrop-blur-sm sm:p-8 lg:flex-none">
            <div className="mb-3 space-y-1 lg:mb-6 lg:space-y-2">
              <h1 className="text-xl font-semibold tracking-tight">
                {isDesktop === false ? stepTitles[step] : t("auth.signupTitle")}
              </h1>
              <p className="text-sm leading-normal text-muted-foreground">
                {isDesktop === false
                  ? t("auth.stepProgress", { step: step + 1, total: STEPS.length })
                  : t("auth.signupSub", { min: MIN_AGE })}
              </p>
            </div>

            {isDesktop === false ? (
              <div className="mb-3 flex gap-1" aria-hidden>
                {STEPS.map((key, index) => (
                  <div
                    key={key}
                    className={cn(
                      "h-1 flex-1 rounded-full",
                      index <= step ? "bg-primary" : "bg-muted",
                    )}
                  />
                ))}
              </div>
            ) : null}

            {isDesktop === null ? (
              <div className="space-y-3" aria-hidden>
                <div className="h-11 rounded-lg bg-muted" />
                <div className="h-11 rounded-lg bg-muted" />
                <div className="h-11 rounded-lg bg-muted" />
              </div>
            ) : (
              <KeyboardSafeForm onSubmit={onSubmit} className="gap-3 max-lg:min-h-0 max-lg:flex-1 lg:gap-4">
                {isDesktop ? (
                  <>
                    {about}
                    {address}
                    {passwordFields}
                    {photoFields}
                    {errorAlert}
                    <Button
                      type="submit"
                      className="min-h-11 w-full"
                      disabled={pending || ageCheck.status === "blocked"}
                    >
                      {pending ? (
                        <BusyLabel busy busyText={t("auth.creatingAccount")}>
                          {t("auth.submitSignup")}
                        </BusyLabel>
                      ) : (
                        t("auth.submitSignup")
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    {step === 0 ? about : null}
                    {step === 1 ? address : null}
                    {step === 2 ? (
                      <div className="my-auto flex w-full flex-col items-center gap-5">
                        <div
                          className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary"
                          aria-hidden
                        >
                          <KeyRound className="size-8" />
                        </div>
                        {passwordFields}
                      </div>
                    ) : null}
                    {step === 3 ? photoFields : null}
                    {errorAlert}
                    <div
                      className={cn(
                        "flex gap-2",
                        step !== 2 && "max-lg:mt-auto",
                        step === 0 && "flex-col",
                      )}
                    >
                      {step > 0 ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="min-h-11 flex-1"
                          onClick={goBack}
                        >
                          {t("auth.back")}
                        </Button>
                      ) : null}
                      {step < STEPS.length - 1 ? (
                        <Button
                          type="button"
                          className="min-h-11 flex-1"
                          onClick={goNext}
                          disabled={step === 0 && ageCheck.status === "blocked"}
                        >
                          {t("auth.next")}
                        </Button>
                      ) : (
                        <Button
                          type="submit"
                          className="min-h-11 flex-1"
                          disabled={pending}
                        >
                          {pending ? (
                        <BusyLabel busy busyText={t("auth.creatingAccount")}>
                          {t("auth.submitSignup")}
                        </BusyLabel>
                      ) : (
                        t("auth.submitSignup")
                      )}
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </KeyboardSafeForm>
            )}

            <p className="mt-3 text-sm leading-normal text-muted-foreground lg:mt-4">
              {t("auth.alreadyAccount")}{" "}
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
