"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  EkycCameraCapture,
  type EkycCaptureResult,
} from "@/components/profile/ekyc-camera-capture";
import { updateProfilePhotoAction } from "@/lib/actions/auth";
import { photoUrl } from "@/lib/photos-client";
import { Button } from "@/components/ui/button";
import { BusyLabel, ActionSpinner } from "@/components/ux/action-spinner";
import { toast } from "sonner";
import { useT } from "@/i18n/locale-provider";

export function ProfilePhotoCard({
  photoKey,
  compact = false,
}: {
  photoKey: string | null;
  compact?: boolean;
}) {
  const router = useRouter();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const src = photoUrl(photoKey);

  async function onCapture(result: EkycCaptureResult) {
    setPending(true);
    try {
      const res = await updateProfilePhotoAction({
        photoBase64: result.base64,
        photoMimeType: result.mimeType,
      });
      if (!res.ok) {
        toast.error(res.error);
        throw new Error(res.error);
      }
      toast.success("Photo updated");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className={
        compact
          ? "flex items-center gap-4"
          : "flex flex-col items-center gap-3 sm:flex-row sm:items-start"
      }
    >
      <div className="relative size-20 shrink-0 overflow-hidden rounded-full border-2 border-background bg-muted shadow-sm ring-1 ring-border sm:size-24">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt="Profile"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            No photo
          </div>
        )}
        {pending ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <ActionSpinner className="size-5" label={t("pass.pay.savingPhoto")} />
          </div>
        ) : null}
      </div>
      <div className="min-w-0 space-y-1.5">
        <p className="text-sm font-medium">Identity photo</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          Live camera only — used at boarding check-in. Uploads are not allowed.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-10"
          disabled={pending}
          onClick={() => setOpen(true)}
        >
          <BusyLabel busy={pending} busyText={t("pass.pay.savingPhoto")}>
            {src ? "Retake photo" : "Take photo"}
          </BusyLabel>
        </Button>
      </div>
      <EkycCameraCapture
        open={open}
        onOpenChange={setOpen}
        onCapture={onCapture}
      />
    </div>
  );
}
