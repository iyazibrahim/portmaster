"use client";

import { useState, useTransition } from "react";
import {
  actionClearReceiptLogo,
  actionLockItSettings,
  actionSaveItSettings,
  actionSaveOpsSettings,
  actionUnlockItSettings,
  actionUploadReceiptLogo,
} from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

export function SettingsPanel({
  ops: initialOps,
  it: initialIt,
  itUnlocked: initialUnlocked,
}: {
  ops: Record<string, string>;
  it: Record<string, string>;
  itUnlocked: boolean;
}) {
  const [ops, setOps] = useState(initialOps);
  const [it, setIt] = useState(initialIt);
  const [itPassword, setItPassword] = useState("");
  const [newItPassword, setNewItPassword] = useState("");
  const [unlocked, setUnlocked] = useState(initialUnlocked);
  const [pending, startTransition] = useTransition();

  function setOp(key: string, value: string) {
    setOps((o) => ({ ...o, [key]: value }));
  }
  function setItField(key: string, value: string) {
    setIt((o) => ({ ...o, [key]: value }));
  }

  const maintenanceOn = ops.maintenance_banner_on === "true";
  const logoSrc = ops.receipt_logo_key
    ? `/api/photos/${encodeURIComponent(ops.receipt_logo_key)}`
    : "/brand/tiangpass-logo.png";

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <BentoTile
          title="Association fee"
          description="Day-pass fee charged to anglers (sen)."
        >
          <Field
            label="Fee (cents)"
            value={ops.association_fee_cents}
            onChange={(v) => setOp("association_fee_cents", v)}
          />
          <p className="text-xs text-muted-foreground">
            {ops.association_fee_cents
              ? `Display ≈ MYR ${(Number(ops.association_fee_cents) / 100).toFixed(2)}`
              : "Set fee in cents, e.g. 500 = MYR 5.00"}
          </p>
        </BentoTile>

        <BentoTile
          title="Reservation & overdue"
          description="Hold window after purchase and overdue check-in threshold."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Reservation (minutes)"
              value={ops.reservation_minutes}
              onChange={(v) => setOp("reservation_minutes", v)}
            />
            <Field
              label="Overdue (hours)"
              value={ops.overdue_hours}
              onChange={(v) => setOp("overdue_hours", v)}
            />
          </div>
        </BentoTile>

        <BentoTile
          title="Geofence default"
          description="Default purchase radius for new jetties."
        >
          <Field
            label="Default radius (metres)"
            value={ops.default_geofence_radius_m}
            onChange={(v) => setOp("default_geofence_radius_m", v)}
          />
        </BentoTile>

        <BentoTile
          title="Jetty GPS check"
          description="Operators and anglers must be at the registered jetty. Turn off for testing."
        >
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              size="sm"
              variant={ops.require_jetty_geofence !== "false" ? "default" : "outline"}
              className="rounded-full"
              onClick={() =>
                setOp(
                  "require_jetty_geofence",
                  ops.require_jetty_geofence === "false" ? "true" : "false",
                )
              }
            >
              {ops.require_jetty_geofence === "false" ? "GPS off (testing)" : "GPS required"}
            </Button>
            <span className="text-sm text-muted-foreground">
              {ops.require_jetty_geofence === "false"
                ? "Check-in and pass purchase skip the jetty radius."
                : "Enforced for operators and anglers. Admin scan still bypasses."}
            </span>
          </div>
        </BentoTile>

        <BentoTile
          title="Support"
          description="Contact numbers shown to anglers."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Support phone"
              value={ops.support_phone}
              onChange={(v) => setOp("support_phone", v)}
            />
            <Field
              label="WhatsApp"
              value={ops.support_whatsapp}
              onChange={(v) => setOp("support_whatsapp", v)}
            />
          </div>
        </BentoTile>

        <BentoTile
          title="Maintenance"
          description="Banner shown site-wide when enabled."
          className="lg:col-span-2"
        >
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              size="sm"
              variant={maintenanceOn ? "default" : "outline"}
              className="rounded-full"
              onClick={() =>
                setOp("maintenance_banner_on", maintenanceOn ? "false" : "true")
              }
            >
              {maintenanceOn ? "Banner on" : "Banner off"}
            </Button>
            <span className="text-sm text-muted-foreground">
              {maintenanceOn ? "Visible to users" : "Hidden"}
            </span>
          </div>
          <div className="mt-3 flex flex-col gap-1.5">
            <Label>Banner text</Label>
            <Textarea
              className="min-h-20 max-w-2xl"
              value={ops.maintenance_banner_text}
              onChange={(e) =>
                setOp("maintenance_banner_text", e.target.value)
              }
              disabled={!maintenanceOn}
              placeholder="Scheduled maintenance message…"
            />
          </div>
        </BentoTile>

        <BentoTile
          title="Receipt / letterhead"
          description="Printed on Download / print receipt for paid passes (includes boarding QR)."
          className="lg:col-span-2"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex shrink-0 flex-col items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoSrc ?? "/brand/tiangpass-logo.png"}
                alt="Receipt logo"
                className="h-20 w-20 rounded-lg border bg-white object-contain p-2"
              />
              <Label
                htmlFor="receipt-logo"
                className="cursor-pointer text-xs font-medium text-primary underline-offset-2 hover:underline"
              >
                Upload logo
              </Label>
              <input
                id="receipt-logo"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                disabled={pending}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  const fd = new FormData();
                  fd.set("logo", file);
                  startTransition(async () => {
                    const result = await actionUploadReceiptLogo(fd);
                    if (!result.ok) {
                      toast.error(result.error);
                      return;
                    }
                    setOp("receipt_logo_key", result.key);
                    toast.success("Receipt logo updated");
                  });
                }}
              />
              {ops.receipt_logo_key ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await actionClearReceiptLogo();
                      setOp("receipt_logo_key", "");
                      toast.message("Using default TiangPass logo");
                    })
                  }
                >
                  Use default logo
                </Button>
              ) : (
                <p className="text-[11px] text-muted-foreground">Default brand logo</p>
              )}
            </div>
            <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
              <Field
                label="Organisation name"
                value={ops.receipt_org_name}
                onChange={(v) => setOp("receipt_org_name", v)}
                className="sm:col-span-2"
              />
              <Field
                label="Tagline"
                value={ops.receipt_tagline}
                onChange={(v) => setOp("receipt_tagline", v)}
                className="sm:col-span-2"
              />
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label>Address</Label>
                <Textarea
                  className="min-h-20 max-w-2xl"
                  value={ops.receipt_address ?? ""}
                  onChange={(e) => setOp("receipt_address", e.target.value)}
                  placeholder="Street, postcode, city…"
                />
              </div>
              <Field
                label="Registration / permit no."
                value={ops.receipt_reg_no}
                onChange={(v) => setOp("receipt_reg_no", v)}
              />
              <Field
                label="Receipt phone"
                value={ops.receipt_phone}
                onChange={(v) => setOp("receipt_phone", v)}
              />
              <Field
                label="Receipt email"
                value={ops.receipt_email}
                onChange={(v) => setOp("receipt_email", v)}
              />
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label>Footer note</Label>
                <Textarea
                  className="min-h-16 max-w-2xl"
                  value={ops.receipt_footer ?? ""}
                  onChange={(e) => setOp("receipt_footer", e.target.value)}
                  placeholder="Association fee · non-refundable…"
                />
              </div>
            </div>
          </div>
        </BentoTile>
      </div>

      <div className="flex justify-end">
        <Button
          className="min-h-11"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await actionSaveOpsSettings(ops);
              toast.success("Ops settings saved");
            })
          }
        >
          Save ops settings
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>IT / integrations</CardTitle>
        </CardHeader>
        <CardContent>
          {!unlocked ? (
            <div className="flex max-w-md flex-col gap-3">
              <Alert>
                <AlertTitle>Password required</AlertTitle>
                <AlertDescription>
                  Enter the IT settings password to unlock for about 20 minutes.
                  Demo password: <code>it-settings-demo</code>
                </AlertDescription>
              </Alert>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="it-pass">IT settings password</Label>
                <Input
                  id="it-pass"
                  type="password"
                  className="max-w-xs min-h-11"
                  value={itPassword}
                  onChange={(e) => setItPassword(e.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  className="min-h-11"
                  disabled={pending || !itPassword}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await actionUnlockItSettings(itPassword);
                      if (!result.ok) {
                        toast.error(result.error);
                        return;
                      }
                      setUnlocked(true);
                      setItPassword("");
                      toast.success(
                        `IT settings unlocked (${result.minutes} min)`,
                      );
                    })
                  }
                >
                  Unlock IT settings
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge>Unlocked</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await actionLockItSettings();
                      setUnlocked(false);
                      toast.message("IT settings locked");
                    })
                  }
                >
                  Lock now
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="QR token TTL (hours)"
                  value={it.qr_token_ttl_hours}
                  onChange={(v) => setItField("qr_token_ttl_hours", v)}
                />
                <Field
                  label="APP_URL override"
                  value={it.app_url_override}
                  onChange={(v) => setItField("app_url_override", v)}
                />
                <Field
                  label="Payment gateway API URL"
                  value={it.payment_gateway_api_url}
                  onChange={(v) => setItField("payment_gateway_api_url", v)}
                  className="sm:col-span-2"
                />
                <Field
                  label="Payment gateway key"
                  value={it.payment_gateway_key}
                  onChange={(v) => setItField("payment_gateway_key", v)}
                  className="sm:col-span-2"
                />
                <Field
                  label="SMTP host"
                  value={it.smtp_host}
                  onChange={(v) => setItField("smtp_host", v)}
                />
                <Field
                  label="SMTP user"
                  value={it.smtp_user}
                  onChange={(v) => setItField("smtp_user", v)}
                />
                <Field
                  label="SMTP pass"
                  value={it.smtp_pass}
                  onChange={(v) => setItField("smtp_pass", v)}
                  type="password"
                />
                <Field
                  label="Webhook secret"
                  value={it.webhook_secret}
                  onChange={(v) => setItField("webhook_secret", v)}
                  type="password"
                />
                <Field
                  label="Change IT password (optional)"
                  value={newItPassword}
                  onChange={setNewItPassword}
                  type="password"
                  className="sm:col-span-2"
                />
                <Field
                  label="Legacy booking window copy"
                  value={ops.booking_window_copy}
                  onChange={(v) => setOp("booking_window_copy", v)}
                  className="sm:col-span-2"
                />
                <Field
                  label="Default party-size max (legacy)"
                  value={ops.default_party_size_max}
                  onChange={(v) => setOp("default_party_size_max", v)}
                />
              </div>
            </div>
          )}
        </CardContent>
        {unlocked ? (
          <CardFooter className="justify-end gap-2 border-t">
            <Button
              variant="outline"
              className="min-h-11"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await actionSaveOpsSettings(ops);
                  toast.success("Legacy ops fields saved");
                })
              }
            >
              Save legacy ops
            </Button>
            <Button
              className="min-h-11"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await actionSaveItSettings({
                    ...it,
                    ...(newItPassword
                      ? { it_settings_password: newItPassword }
                      : {}),
                  });
                  if (!result.ok) {
                    toast.error(result.error);
                    setUnlocked(false);
                    return;
                  }
                  setNewItPassword("");
                  toast.success("IT settings saved");
                })
              }
            >
              Save IT settings
            </Button>
          </CardFooter>
        ) : null}
      </Card>
    </div>
  );
}

function BentoTile({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl bg-muted/30 p-4 ring-1 ring-foreground/10 ${className ?? ""}`}
    >
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      <div className="mt-3 space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      <Input
        type={type}
        className="min-h-11 max-w-md"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
