"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/locale-provider";
import { MY_STATES } from "@/lib/my-address";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { EkycCaptureResult } from "@/components/profile/ekyc-camera-capture";
import { RequiredMark } from "@/components/auth/required-mark";

export function AboutFields({
  columns,
  name,
  email,
  phone,
  myKad,
  citizenship,
  dob,
  maxDob,
  onName,
  onEmail,
  onEmailBlur,
  emailError,
  onPhone,
  onMyKad,
  onCitizenship,
  onDob,
  ageNotice,
}: {
  columns?: boolean;
  name: string;
  email: string;
  phone: string;
  myKad: string;
  citizenship: string;
  dob: string;
  maxDob: string;
  onName: (value: string) => void;
  onEmail: (value: string) => void;
  onEmailBlur?: () => void;
  emailError?: string | null;
  onPhone: (value: string) => void;
  onMyKad: (value: string) => void;
  onCitizenship: (value: string) => void;
  onDob: (value: string) => void;
  ageNotice?: ReactNode;
}) {
  const { t } = useT();
  return (
    <div className="space-y-4">
      <div
        className={cn(
          "grid grid-cols-1 gap-3",
          columns && "sm:grid-cols-2 lg:gap-4",
        )}
      >
        <TextField
          id="name"
          label={t("auth.name")}
          required
          autoComplete="name"
          value={name}
          onChange={onName}
        />
        <TextField
          id="email"
          label={t("auth.email")}
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={onEmail}
          onBlur={onEmailBlur}
          invalid={Boolean(emailError)}
          error={emailError}
        />
        <TextField
          id="phone"
          label={t("auth.mobile")}
          type="tel"
          required
          autoComplete="tel"
          value={phone}
          onChange={onPhone}
        />
        <TextField
          id="myKad"
          label={t("auth.myKad")}
          required
          autoComplete="off"
          inputMode="numeric"
          maxLength={14}
          value={myKad}
          onChange={onMyKad}
        />
        <div className="flex flex-col gap-2">
          <Label htmlFor="citizenship">
            {t("auth.citizenship")}
            <RequiredMark />
          </Label>
          <select
            id="citizenship"
            required
            value={citizenship}
            onChange={(e) => onCitizenship(e.target.value)}
            className="flex min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="MY">{t("auth.citizenshipMY")}</option>
            <option value="OTHER">{t("auth.citizenshipOther")}</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="dob">{t("auth.dob")}</Label>
          <Input
            id="dob"
            type="date"
            value={dob}
            max={maxDob}
            onChange={(e) => onDob(e.target.value)}
          />
        </div>
      </div>
      {ageNotice}
    </div>
  );
}

export function AddressFields({
  columns,
  unit,
  street,
  postcode,
  stateId,
  emergencyName,
  emergencyPhone,
  onUnit,
  onStreet,
  onPostcode,
  onState,
  onEmergencyName,
  onEmergencyPhone,
}: {
  columns?: boolean;
  unit: string;
  street: string;
  postcode: string;
  stateId: string;
  emergencyName: string;
  emergencyPhone: string;
  onUnit: (value: string) => void;
  onStreet: (value: string) => void;
  onPostcode: (value: string) => void;
  onState: (value: string) => void;
  onEmergencyName: (value: string) => void;
  onEmergencyPhone: (value: string) => void;
}) {
  const { t } = useT();
  return (
    <div className="space-y-3 lg:space-y-4">
      <div
        className={cn(
          "grid grid-cols-1 gap-3",
          columns && "sm:grid-cols-2 lg:gap-4",
        )}
      >
        <TextField
          id="addressUnit"
          label={t("auth.addressUnit")}
          required
          autoComplete="address-line1"
          value={unit}
          onChange={onUnit}
        />
        <TextField
          id="addressStreet"
          label={t("auth.addressStreet")}
          required
          autoComplete="address-line2"
          value={street}
          onChange={onStreet}
        />
        <TextField
          id="addressPostcode"
          label={t("auth.addressPostcode")}
          required
          autoComplete="postal-code"
          inputMode="numeric"
          maxLength={5}
          value={postcode}
          onChange={(value) => onPostcode(value.replace(/\D/g, "").slice(0, 5))}
        />
        <div className="flex flex-col gap-2">
          <Label htmlFor="addressState">
            {t("auth.addressState")}
            <RequiredMark />
          </Label>
          <SearchableSelect
            id="addressState"
            options={MY_STATES.map((state) => ({
              value: state.id,
              label: state.name,
            }))}
            value={stateId}
            onValueChange={onState}
            placeholder={t("auth.addressStatePlaceholder")}
            searchPlaceholder={t("auth.addressStateSearch")}
            emptyText={t("auth.addressStateEmpty")}
          />
        </div>
      </div>
      <div className="space-y-2 border-t border-border/70 pt-3 lg:space-y-4 lg:pt-4">
        <p className="text-sm font-medium">{t("auth.emergencyHeading")}</p>
        <div
          className={cn(
            "grid grid-cols-1 gap-3",
            columns && "sm:grid-cols-2 lg:gap-4",
          )}
        >
          <TextField
            id="emergencyContactName"
            label={t("auth.emergencyName")}
            required
            autoComplete="name"
            value={emergencyName}
            onChange={onEmergencyName}
          />
          <TextField
            id="emergencyContact"
            label={t("auth.emergencyPhone")}
            type="tel"
            required
            autoComplete="tel"
            value={emergencyPhone}
            onChange={onEmergencyPhone}
          />
        </div>
      </div>
    </div>
  );
}

export function PhotoFields({
  photo,
  acceptPolicy,
  acceptPdpa,
  acceptLocation,
  onOpenCamera,
  onAcceptPolicy,
  onAcceptPdpa,
  onAcceptLocation,
}: {
  photo: EkycCaptureResult | null;
  acceptPolicy: boolean;
  acceptPdpa: boolean;
  acceptLocation: boolean;
  onOpenCamera: () => void;
  onAcceptPolicy: (value: boolean) => void;
  onAcceptPdpa: (value: boolean) => void;
  onAcceptLocation: (value: boolean) => void;
}) {
  const { t } = useT();
  const policyParts = t("auth.acceptPolicy").split("{policy}");
  const pdpaParts = t("auth.acceptPdpa").split("{notice}");

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 rounded-lg border border-border/70 p-4">
        <Label>
          {t("auth.photoLabel")}
          <RequiredMark />
        </Label>
        <div className="flex flex-col items-center gap-4 text-center lg:flex-row lg:items-center lg:text-left">
          <div className="size-24 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo.previewUrl}
                alt="Captured identity"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                {t("auth.noPhoto")}
              </div>
            )}
          </div>
          <div className="flex w-full flex-col items-center gap-2 lg:items-start">
            <Button type="button" variant="outline" className="w-full lg:w-auto" onClick={onOpenCamera}>
              {photo ? t("auth.retakePhoto") : t("auth.openCamera")}
            </Button>
            <p className="max-w-sm text-xs leading-normal text-muted-foreground">
              {t("auth.photoHint")}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <Consent
          checked={acceptPolicy}
          onChange={onAcceptPolicy}
        >
          {policyParts[0]}
          <Link
            href="/policy"
            className="text-primary underline-offset-4 hover:underline"
            target="_blank"
          >
            {t("auth.privacyPolicy")}
          </Link>
          {policyParts[1] ?? ""}
        </Consent>
        <Consent checked={acceptPdpa} onChange={onAcceptPdpa}>
          {pdpaParts[0]}
          <Link
            href="/consent"
            className="text-primary underline-offset-4 hover:underline"
            target="_blank"
          >
            {t("auth.pdpaNotice")}
          </Link>
          {pdpaParts[1] ?? ""}
        </Consent>
        <Consent checked={acceptLocation} onChange={onAcceptLocation}>
          {t("auth.acceptLocation")}
        </Consent>
      </div>
    </div>
  );
}

function Consent({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex items-start gap-3 text-sm leading-snug">
      <input
        type="checkbox"
        className="mt-1 size-4 shrink-0 accent-[var(--primary)]"
        checked={checked}
        aria-required="true"
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        {children} <RequiredMark />
      </span>
    </label>
  );
}

function TextField({
  id,
  label,
  type = "text",
  required,
  autoComplete,
  inputMode,
  maxLength,
  placeholder,
  value,
  onChange,
  onBlur,
  invalid,
  error,
  className,
}: {
  id: string;
  label: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  inputMode?: "numeric" | "text" | "tel" | "email";
  maxLength?: number;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  error?: string | null;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Label htmlFor={id}>
        {label}
        {required ? <RequiredMark /> : null}
      </Label>
      <Input
        id={id}
        name={id}
        type={type}
        required={required}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        placeholder={placeholder}
        value={value}
        aria-invalid={invalid || undefined}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
      {error ? (
        <p className="text-xs leading-normal text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
