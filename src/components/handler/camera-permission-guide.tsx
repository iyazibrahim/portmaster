"use client";

import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useT } from "@/i18n/locale-provider";
import {
  detectPwaPlatform,
  type PwaPlatform,
} from "@/components/pwa-install-guide";

function stepsFor(platform: PwaPlatform) {
  if (platform === "ios-safari" || platform === "ios-other") {
    return [
      "scan.camHelp.ios.1",
      "scan.camHelp.ios.2",
      "scan.camHelp.ios.3",
      "scan.camHelp.ios.4",
    ] as const;
  }
  if (platform === "android" || platform === "android-inapp") {
    return [
      "scan.camHelp.android.1",
      "scan.camHelp.android.2",
      "scan.camHelp.android.3",
      "scan.camHelp.android.4",
    ] as const;
  }
  return [
    "scan.camHelp.desktop.1",
    "scan.camHelp.desktop.2",
    "scan.camHelp.desktop.3",
  ] as const;
}

function leadFor(platform: PwaPlatform, t: (key: string) => string) {
  if (platform === "ios-safari" || platform === "ios-other") {
    return t("scan.camHelp.ios.lead");
  }
  if (platform === "android" || platform === "android-inapp") {
    return t("scan.camHelp.android.lead");
  }
  return t("scan.camHelp.desktop.lead");
}

export function isCameraPermissionBlockedError(message: string | null | undefined) {
  if (!message) return false;
  return /camera permission|notallowed|permission.*(denied|blocked)|blocked.*camera/i.test(
    message,
  );
}

/** Step-by-step how to turn camera back on after Block / Don’t Allow. */
export function CameraPermissionGuide({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useT();
  const platform = useSyncExternalStore(
    () => () => {},
    detectPwaPlatform,
    (): PwaPlatform => "other",
  );
  const steps = stepsFor(platform);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("scan.camHelp.title")}</DialogTitle>
          <DialogDescription>{leadFor(platform, t)}</DialogDescription>
        </DialogHeader>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-foreground">
          {steps.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ol>
        <p className="text-xs text-muted-foreground">{t("scan.camHelp.after")}</p>
        <Button type="button" className="w-full" onClick={() => onOpenChange(false)}>
          {t("scan.camHelp.done")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
