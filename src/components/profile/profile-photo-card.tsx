"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  EkycCameraCapture,
  type EkycCaptureResult,
} from "@/components/profile/ekyc-camera-capture";
import { updateProfilePhotoAction } from "@/lib/actions/auth";
import { photoUrl } from "@/lib/photos-client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ProfilePhotoCard({
  photoKey,
  compact = false,
}: {
  photoKey: string | null;
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const src = photoUrl(photoKey);

  function onCapture(result: EkycCaptureResult) {
    startTransition(async () => {
      const res = await updateProfilePhotoAction({
        photoBase64: result.base64,
        photoMimeType: result.mimeType,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Photo updated");
      router.refresh();
    });
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
          {pending ? "Saving…" : src ? "Retake photo" : "Take photo"}
        </Button>
      </div>
      <EkycCameraCapture
        open={open}
        onOpenChange={setOpen}
        onCapture={onCapture}
        title={src ? "Retake identity photo" : "Take identity photo"}
      />
    </div>
  );
}
