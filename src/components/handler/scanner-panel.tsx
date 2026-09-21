"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  actionPreviewPassToken,
  actionScanToken,
} from "@/lib/actions/booking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { StatusBadge } from "@/components/status-badge";
import { photoUrl } from "@/lib/photos-client";

type Preview = {
  passId: string;
  reference: string;
  status: string;
  validOn: string;
  anglerName: string;
  myKadLast4: string | null;
  photoKey: string | null;
  pillarName: string;
  jettyName: string;
  nextAction: "CHECK_IN" | "CHECK_OUT" | null;
};

function getPosition(): Promise<{ lat: string; lng: string }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: String(pos.coords.latitude),
          lng: String(pos.coords.longitude),
        }),
      reject,
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 15_000 },
    );
  });
}

function prefersMobileScanner() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 1023px), (pointer: coarse)").matches;
}

export function ScannerPanel({ isAdmin = false }: { isAdmin?: boolean }) {
  const [token, setToken] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [mobileUi, setMobileUi] = useState(false);
  const [pending, startTransition] = useTransition();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectTimer = useRef<number | null>(null);
  const startingRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  function clearDetectTimer() {
    if (detectTimer.current) {
      window.clearTimeout(detectTimer.current);
      detectTimer.current = null;
    }
  }

  function stopCamera() {
    clearDetectTimer();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraOn(false);
  }

  function onDecoded(value: string) {
    const decoded = value.trim();
    if (!decoded) return;
    setToken(decoded);
    stopCamera();
    void loadPreview(decoded);
  }

  function scheduleDetect(tick: () => void, ms: number) {
    clearDetectTimer();
    detectTimer.current = window.setTimeout(tick, ms);
  }

  async function startJsQrLoop() {
    const { default: jsQR } = await import("jsqr");
    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const tick = () => {
      if (!streamRef.current) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.videoWidth < 8) {
        scheduleDetect(tick, 250);
        return;
      }
      const maxW = 640;
      const scale = Math.min(1, maxW / video.videoWidth);
      const w = Math.max(1, Math.round(video.videoWidth * scale));
      const h = Math.max(1, Math.round(video.videoHeight * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.drawImage(video, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "attemptBoth",
      });
      const value = code?.data?.trim();
      if (value) {
        onDecoded(value);
        return;
      }
      scheduleDetect(tick, 280);
    };
    tick();
  }

  function startBarcodeDetectorLoop(
    Detector: new (opts: { formats: string[] }) => {
      detect: (source: ImageBitmapSource) => Promise<{ rawValue: string }[]>;
    },
  ) {
    const detector = new Detector({ formats: ["qr_code"] });
    const tick = () => {
      if (!streamRef.current) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        scheduleDetect(() => void tick(), 250);
        return;
      }
      void detector
        .detect(video)
        .then((codes) => {
          const value = codes[0]?.rawValue?.trim();
          if (value) {
            onDecoded(value);
            return;
          }
          scheduleDetect(() => void tick(), 400);
        })
        .catch(() => {
          scheduleDetect(() => void tick(), 400);
        });
    };
    tick();
  }

  async function startCamera() {
    if (startingRef.current || streamRef.current) return;
    startingRef.current = true;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOn(true);

      const Detector = (
        window as unknown as {
          BarcodeDetector?: new (opts: {
            formats: string[];
          }) => {
            detect: (
              source: ImageBitmapSource,
            ) => Promise<{ rawValue: string }[]>;
          };
        }
      ).BarcodeDetector;

      if (Detector) {
        startBarcodeDetectorLoop(Detector);
      } else {
        // iOS Chrome/Safari has no BarcodeDetector — decode frames with jsQR.
        await startJsQrLoop();
      }
    } catch {
      setError("Could not open camera. Check permissions or paste the token.");
      setCameraOn(false);
    } finally {
      startingRef.current = false;
    }
  }

  // Attach stream once the video element is mounted (needed for auto-start).
  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!cameraOn || !video || !stream) return;
    video.srcObject = stream;
    void video.play().catch(() => {
      /* autoplay may need a gesture on some desktops */
    });
  }, [cameraOn]);

  // Mobile / coarse pointer: open rear camera immediately for quick scan.
  useEffect(() => {
    const mobile = prefersMobileScanner();
    const id = window.setTimeout(() => {
      setMobileUi(mobile);
      if (mobile) {
        void startCamera();
      }
    }, 0);
    return () => {
      window.clearTimeout(id);
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only auto-start
  }, []);

  function loadPreview(raw: string) {
    setError(null);
    setPreview(null);
    startTransition(async () => {
      try {
        const res = await actionPreviewPassToken(raw);
        if (!res) {
          setError("Pass QR not found.");
          return;
        }
        setPreview(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Preview failed");
      }
    });
  }

  function confirmScan() {
    if (!token.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        let coords: { lat?: string; lng?: string } = {};
        if (!isAdmin) {
          coords = await getPosition();
        }
        const res = await actionScanToken(token, coords);
        if (res.kind === "pass") {
          toast.success(
            res.action === "CHECK_IN" ? "Checked in" : "Checked out",
          );
          setPreview(res.preview ?? null);
          setToken("");
        } else {
          toast.success(
            res.action === "CHECK_IN" ? "Checked in (legacy)" : "Checked out",
          );
          setToken("");
          setPreview(null);
        }
        if (mobileUi || prefersMobileScanner()) {
          void startCamera();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Scan failed");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="px-4 pt-4 sm:px-5 sm:pt-5">
          <CardTitle className="text-base">Scan fishing pass QR</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 sm:px-5">
          <div className="relative overflow-hidden rounded-lg bg-black">
            <video
              ref={videoRef}
              className={
                cameraOn
                  ? "aspect-[3/4] w-full object-cover sm:aspect-video"
                  : "hidden"
              }
              muted
              playsInline
              autoPlay
            />
            {!cameraOn ? (
              <div className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-3 bg-muted px-4 sm:aspect-video">
                <p className="text-center text-sm text-muted-foreground">
                  {mobileUi
                    ? "Allow camera access to scan, or paste a token below."
                    : "Open the camera to scan a pass QR, or paste a token below."}
                </p>
                <Button type="button" onClick={() => void startCamera()}>
                  {mobileUi ? "Retry camera" : "Open camera"}
                </Button>
              </div>
            ) : (
              <>
                <p className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/55 to-transparent px-3 py-2.5 text-center text-xs text-white">
                  Point the camera at the pass QR
                </p>
                <div className="absolute inset-x-0 bottom-0 flex justify-end bg-gradient-to-t from-black/60 to-transparent p-3">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={stopCamera}
                  >
                    Stop camera
                  </Button>
                </div>
              </>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="token">Or paste QR token</Label>
            <Input
              id="token"
              className="min-h-11 font-mono text-sm"
              placeholder="Opaque token from angler QR"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </div>
          {!isAdmin ? (
            <p className="text-xs text-muted-foreground">
              GPS is required. You must be at your registered jetty.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Admin scan: jetty geofence bypassed.
            </p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2 border-t px-4 py-4 sm:flex-row sm:justify-end sm:px-5">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full sm:w-auto"
            disabled={pending || !token.trim()}
            onClick={() => loadPreview(token)}
          >
            Preview
          </Button>
          <Button
            type="button"
            className="min-h-11 w-full sm:w-auto"
            disabled={pending || !token.trim() || !preview?.nextAction}
            onClick={confirmScan}
          >
            {pending
              ? "Working…"
              : preview?.nextAction === "CHECK_OUT"
                ? "Confirm check-out"
                : "Confirm check-in"}
          </Button>
        </CardFooter>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Scan error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {preview ? (
        <Card>
          <CardHeader className="px-4 pt-4 sm:px-5 sm:pt-5">
            <CardTitle className="text-base">Angler verification</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 px-4 pb-4 sm:flex-row sm:px-5 sm:pb-5">
            {preview.photoKey ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl(preview.photoKey) ?? undefined}
                alt={preview.anglerName}
                className="size-28 rounded-lg border object-cover"
              />
            ) : (
              <div className="flex size-28 items-center justify-center rounded-lg border bg-muted text-xs text-muted-foreground">
                No photo
              </div>
            )}
            <dl className="grid flex-1 gap-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Name</dt>
                <dd className="font-medium">{preview.anglerName}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">MyKad</dt>
                <dd className="font-mono">****{preview.myKadLast4 ?? "----"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Pass</dt>
                <dd>{preview.reference}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Pillar</dt>
                <dd>{preview.pillarName}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Jetty</dt>
                <dd>{preview.jettyName}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <StatusBadge status={preview.status} />
                </dd>
              </div>
              <p className="text-xs text-muted-foreground">
                Visually compare the person to the photo before confirming.
              </p>
            </dl>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
