"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BusyLabel, ActionSpinner } from "@/components/ux/action-spinner";
import { useT } from "@/i18n/locale-provider";

export type EkycCaptureResult = {
  base64: string;
  mimeType: string;
  previewUrl: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (result: EkycCaptureResult) => void | Promise<void>;
  title?: string;
};

/**
 * Identity photo from the camera, or a JPEG/PNG/WebP file when the camera
 * is unavailable. The server still re-encodes the image.
 */
export function EkycCameraCapture({
  open,
  onOpenChange,
  onCapture,
  title = "Identity photo",
}: Props) {
  const { t } = useT();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [processing, setProcessing] = useState(false);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (!open) {
      stopTracks();
      return;
    }

    let cancelled = false;
    const bootId = window.setTimeout(() => {
      if (cancelled) return;
      setError(null);
      setReady(false);
      setProcessing(false);
    }, 0);

    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 720 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
          if (!cancelled) setReady(true);
        }
      } catch {
        if (!cancelled) {
          setError(
            "Could not open the camera. Allow camera access and try again. Uploading a file is not allowed.",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(bootId);
      stopTracks();
    };
  }, [open, stopTracks]);

  async function snap() {
    const video = videoRef.current;
    if (!video || !ready || processing) return;
    const size = Math.min(video.videoWidth, video.videoHeight) || 480;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const sx = Math.max(0, (video.videoWidth - size) / 2);
    const sy = Math.max(0, (video.videoHeight - size) / 2);
    ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);
    setProcessing(true);
    setError(null);
    try {
      const { compressEkycCanvas } = await import("@/lib/ekyc-compress");
      const compressed = await compressEkycCanvas(canvas);
      await onCapture({
        base64: compressed.base64,
        mimeType: compressed.mimeType,
        previewUrl: compressed.previewUrl,
      });
      onOpenChange(false);
    } catch {
      setError("Could not compress photo. Try again.");
    } finally {
      setProcessing(false);
    }
  }

  function retry() {
    onOpenChange(false);
    window.setTimeout(() => onOpenChange(true), 50);
  }

  async function onFile(file: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPEG, PNG, or WebP photo.");
      return;
    }
    setProcessing(true);
    setError(null);
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("Could not read that photo."));
        el.src = url;
      });
      const size = Math.min(img.naturalWidth, img.naturalHeight) || 480;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not read that photo.");
      const sx = Math.max(0, (img.naturalWidth - size) / 2);
      const sy = Math.max(0, (img.naturalHeight - size) / 2);
      ctx.drawImage(img, sx, sy, size, size, 0, 0, size, size);
      const { compressEkycCanvas } = await import("@/lib/ekyc-compress");
      const compressed = await compressEkycCanvas(canvas);
      await onCapture({
        base64: compressed.base64,
        mimeType: compressed.mimeType,
        previewUrl: compressed.previewUrl,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not use that photo.");
    } finally {
      URL.revokeObjectURL(url);
      setProcessing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-4 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Align your face inside the oval, or upload a JPEG, PNG, or WebP
            photo if the camera is unavailable.
          </p>
          <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-xl bg-zinc-900">
            <video
              ref={videoRef}
              playsInline
              muted
              className="h-full w-full scale-x-[-1] object-cover"
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-[72%] w-[58%] rounded-[50%] border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
            </div>
            {processing ? (
              <div
                className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/55 px-4 text-center text-sm font-medium text-white"
                role="status"
                aria-live="polite"
              >
                <span className="inline-flex items-center gap-2">
                  <ActionSpinner className="size-5 text-white" />
                  {t("auth.processingPhoto")}
                </span>
              </div>
            ) : null}
          </div>
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <p className="text-center text-xs text-muted-foreground">
              Keep your face centred and well lit.
            </p>
          )}
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={processing}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void onFile(file);
            }}
          />
          <div className="flex gap-2">
            {error ? (
              <Button
                type="button"
                variant="secondary"
                className="min-h-11"
                disabled={processing}
                onClick={retry}
              >
                Retry camera
              </Button>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              className="min-h-11"
              disabled={processing}
              onClick={() => fileRef.current?.click()}
            >
              Upload photo
            </Button>
            <Button
              type="button"
              className="min-h-11"
              disabled={!ready || processing}
              onClick={() => void snap()}
            >
              <BusyLabel busy={processing} busyText={t("auth.processingPhoto")}>
                Take photo
              </BusyLabel>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
