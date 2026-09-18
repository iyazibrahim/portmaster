"use client";

import { useState, useTransition } from "react";
import {
  actionLockItSettings,
  actionSaveItSettings,
  actionSaveOpsSettings,
  actionUnlockItSettings,
} from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h2 className="text-base font-semibold tracking-tight">Ops settings</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Support phone"
            value={ops.support_phone}
            onChange={(v) => setOp("support_phone", v)}
          />
          <Field
            label="Support WhatsApp (display)"
            value={ops.support_whatsapp}
            onChange={(v) => setOp("support_whatsapp", v)}
          />
          <Field
            label="Platform commission %"
            value={ops.platform_commission_pct}
            onChange={(v) => setOp("platform_commission_pct", v)}
          />
          <Field
            label="Default party-size max"
            value={ops.default_party_size_max}
            onChange={(v) => setOp("default_party_size_max", v)}
          />
          <Field
            label="Location side labels"
            value={ops.location_side_labels}
            onChange={(v) => setOp("location_side_labels", v)}
            className="sm:col-span-2"
          />
          <div className="space-y-1 sm:col-span-2">
            <Label>Booking window copy</Label>
            <Textarea
              className="min-h-24"
              value={ops.booking_window_copy}
              onChange={(e) => setOp("booking_window_copy", e.target.value)}
            />
          </div>
          <Field
            label="Maintenance banner on (true/false)"
            value={ops.maintenance_banner_on}
            onChange={(v) => setOp("maintenance_banner_on", v)}
          />
          <Field
            label="Maintenance banner text"
            value={ops.maintenance_banner_text}
            onChange={(v) => setOp("maintenance_banner_text", v)}
          />
        </div>
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
      </section>

      <section className="space-y-4 border-t border-border pt-8">
        <h2 className="text-base font-semibold tracking-tight">IT settings</h2>
        {!unlocked ? (
          <div className="max-w-md space-y-3">
            <Alert>
              <AlertTitle>Password required</AlertTitle>
              <AlertDescription>
                Enter the IT settings password to unlock for about 20 minutes.
                Demo password: <code>it-settings-demo</code>
              </AlertDescription>
            </Alert>
            <div className="space-y-1">
              <Label htmlFor="it-pass">IT settings password</Label>
              <Input
                id="it-pass"
                type="password"
                className="min-h-11"
                value={itPassword}
                onChange={(e) => setItPassword(e.target.value)}
              />
            </div>
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
                  toast.success(`IT settings unlocked (${result.minutes} min)`);
                })
              }
            >
              Unlock IT settings
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <BadgeUnlocked />
              <Button
                variant="outline"
                className="min-h-11"
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
            </div>
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
          </div>
        )}
      </section>
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
    <div className={`space-y-1 ${className ?? ""}`}>
      <Label>{label}</Label>
      <Input
        type={type}
        className="min-h-11"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function BadgeUnlocked() {
  return (
    <span className="inline-flex min-h-11 items-center rounded-md bg-primary/10 px-3 text-sm font-medium text-primary">
      Unlocked
    </span>
  );
}
