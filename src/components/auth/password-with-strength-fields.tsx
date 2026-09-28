"use client";

import { useState } from "react";
import { Check, Eye, EyeOff, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/locale-provider";
import {
  getPasswordChecks,
  passwordChecksOk,
  passwordStrengthLevel,
} from "@/lib/password-policy";

export function PasswordWithStrengthFields({
  className,
  passwordLabel,
  confirmRequired = true,
}: {
  className?: string;
  passwordLabel?: string;
  confirmRequired?: boolean;
}) {
  const { t } = useT();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [touched, setTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);

  const checks = getPasswordChecks(password);
  const level = passwordStrengthLevel(password);
  const allOk = passwordChecksOk(checks);
  const mismatch =
    confirmTouched && confirm.length > 0 && password !== confirm;

  const strengthLabel =
    level === 0
      ? ""
      : level === 1
        ? t("auth.passwordStrengthWeak")
        : level === 2
          ? t("auth.passwordStrengthFair")
          : level === 3
            ? t("auth.passwordStrengthGood")
            : t("auth.passwordStrengthStrong");

  const strengthColor =
    level <= 1
      ? "bg-destructive"
      : level === 2
        ? "bg-amber-500"
        : level === 3
          ? "bg-sky-500"
          : "bg-emerald-500";

  const rules: { key: keyof typeof checks; label: string }[] = [
    { key: "minLength", label: t("auth.passwordRuleLength") },
    { key: "upper", label: t("auth.passwordRuleUpper") },
    { key: "lower", label: t("auth.passwordRuleLower") },
    { key: "number", label: t("auth.passwordRuleNumber") },
    { key: "symbol", label: t("auth.passwordRuleSymbol") },
  ];

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">{passwordLabel ?? t("auth.password")}</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (!touched) setTouched(true);
            }}
            onBlur={() => setTouched(true)}
            aria-invalid={touched && !allOk ? true : undefined}
            className="pr-12"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={
              showPassword ? t("auth.hidePassword") : t("auth.showPassword")
            }
          >
            {showPassword ? (
              <EyeOff className="size-4" aria-hidden />
            ) : (
              <Eye className="size-4" aria-hidden />
            )}
          </Button>
        </div>

        {password ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex gap-1" aria-hidden>
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 flex-1 rounded-full bg-muted",
                    i <= level && strengthColor,
                  )}
                />
              ))}
            </div>
            {strengthLabel ? (
              <p className="text-xs text-muted-foreground">{strengthLabel}</p>
            ) : null}
          </div>
        ) : (
          <p className="text-xs leading-normal text-muted-foreground">
            {t("auth.passwordHint")}
          </p>
        )}

        {(touched || password.length > 0) && (
          <ul className="grid gap-1 sm:grid-cols-2">
            {rules.map((r) => {
              const ok = checks[r.key];
              return (
                <li
                  key={r.key}
                  className={cn(
                    "flex items-center gap-1.5 text-xs leading-normal",
                    ok
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-destructive",
                  )}
                >
                  {ok ? (
                    <Check className="size-3.5 shrink-0" aria-hidden />
                  ) : (
                    <X className="size-3.5 shrink-0" aria-hidden />
                  )}
                  {r.label}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {confirmRequired ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="confirmPassword">{t("auth.confirmPassword")}</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirm ? "text" : "password"}
              required
              autoComplete="new-password"
              minLength={8}
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                if (!confirmTouched) setConfirmTouched(true);
              }}
              onBlur={() => setConfirmTouched(true)}
              aria-invalid={mismatch ? true : undefined}
              className="pr-12"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground"
              onClick={() => setShowConfirm((v) => !v)}
              aria-label={
                showConfirm ? t("auth.hidePassword") : t("auth.showPassword")
              }
            >
              {showConfirm ? (
                <EyeOff className="size-4" aria-hidden />
              ) : (
                <Eye className="size-4" aria-hidden />
              )}
            </Button>
          </div>
          {mismatch ? (
            <p className="text-xs text-destructive">
              {t("auth.passwordMismatch")}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
