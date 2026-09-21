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

export type EkycCaptureResult = {
  base64: string;
  mimeType: string;
  previewUrl: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (result: EkycCaptureResult) => void;
  title?: string;
};

/**
 * Live camera capture only — no file upload.
 * User aligns face in the oval guide, then snaps.
 */
export function EkycCameraCapture({
  open,
  onOpenChange,
  onCapture,
  title = "Identity photo",
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

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

  function snap() {
    const video = videoRef.current;
    if (!video || !ready) return;
    const size = Math.min(video.videoWidth, video.videoHeight) || 480;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const sx = Math.max(0, (video.videoWidth - size) / 2);
    const sy = Math.max(0, (video.videoHeight - size) / 2);
    ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);
    const mimeType = "image/jpeg";
    const dataUrl = canvas.toDataURL(mimeType, 0.9);
    const base64 = dataUrl.split(",")[1] ?? "";
    if (!base64) {
      setError("Could not capture photo. Try again.");
      return;
    }
    onCapture({ base64, mimeType, previewUrl: dataUrl });
    onOpenChange(false);
  }

  function retry() {
    onOpenChange(false);
    window.setTimeout(() => onOpenChange(true), 50);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-4 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Align your face inside the oval. Photos must be taken live — file
            upload is not allowed.
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
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <div className="flex gap-2">
            {error ? (
              <Button
                type="button"
                variant="secondary"
                className="min-h-11"
                onClick={retry}
              >
                Retry camera
              </Button>
            ) : null}
            <Button
              type="button"
              className="min-h-11"
              disabled={!ready}
              onClick={snap}
            >
              Take photo
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
