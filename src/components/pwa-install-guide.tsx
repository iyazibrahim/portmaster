"use client";

import { Share, MoreVertical, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useT } from "@/i18n/locale-provider";

export type PwaPlatform =
  | "ios-safari"
  | "ios-other"
  | "android"
  | "android-inapp"
  | "other";

function isIosDevice() {
  const ua = navigator.userAgent;
  return (
    /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isInAppBrowser() {
  return /FBAN|FBAV|Instagram|Line\/|Twitter|TikTok|Snapchat|MicroMessenger/i.test(
    navigator.userAgent,
  );
}

export function detectPwaPlatform(): PwaPlatform {
  const ua = navigator.userAgent;
  if (isIosDevice()) {
    const safari =
      /safari/i.test(ua) && !/crios|fxios|edgios|opios/i.test(ua) && !isInAppBrowser();
    return safari ? "ios-safari" : "ios-other";
  }
  if (/android/i.test(ua)) {
    return isInAppBrowser() ? "android-inapp" : "android";
  }
  return "other";
}

function stepsFor(platform: PwaPlatform) {
  if (platform === "ios-safari" || platform === "ios-other") {
    return ["pwa.ios.1", "pwa.ios.2", "pwa.ios.3", "pwa.ios.4"] as const;
  }
  if (platform === "android" || platform === "android-inapp") {
    return ["pwa.android.1", "pwa.android.2", "pwa.android.3", "pwa.android.4"] as const;
  }
  return ["pwa.other.1", "pwa.other.2"] as const;
}

export function PwaInstallGuide({
  open,
  onOpenChange,
  platform,
  canInstall,
  onInstall,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: PwaPlatform;
  canInstall: boolean;
  onInstall: () => void;
}) {
  const { t } = useT();
  const steps = stepsFor(platform);
  const lead =
    platform === "ios-safari"
      ? t("pwa.ios.lead")
      : platform === "ios-other"
        ? t("pwa.iosOpenSafari")
        : platform === "android"
          ? t("pwa.android.lead")
          : platform === "android-inapp"
            ? t("pwa.androidInApp")
            : t("pwa.other.lead");
  const Icon = platform.startsWith("ios") ? Share : platform === "other" ? Smartphone : MoreVertical;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(36rem,calc(100dvh-2rem))] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("pwa.guideTitle")}</DialogTitle>
          <DialogDescription>{lead}</DialogDescription>
        </DialogHeader>
        <ol className="space-y-3">
          {steps.map((key, index) => (
            <li key={key} className="flex items-start gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                {index + 1}
              </span>
              <p className="text-sm leading-snug">{t(key)}</p>
            </li>
          ))}
        </ol>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Icon className="size-3.5 shrink-0" aria-hidden />
          {t("pwa.once")}
        </p>
        <div className="flex flex-col gap-2">
          {canInstall && (platform === "android" || platform === "other") ? (
            <Button type="button" className="min-h-11" onClick={onInstall}>
              {t("pwa.install")}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => onOpenChange(false)}
          >
            {t("pwa.gotIt")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
