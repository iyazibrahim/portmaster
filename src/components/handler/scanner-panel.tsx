"use client";

import { useEffect, useRef, useState } from "react";
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

type JsQrFn = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options?: { inversionAttempts?: "dontInvert" | "attemptBoth" | "onlyInvert" },
) => { data: string } | null;

function prefersMobileScanner() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 1023px), (pointer: coarse)").matches;
}

function formatScanError(err: unknown): string {
  if (err && typeof err === "object" && "code" in err) {
    const code = Number((err as { code: number }).code);
    if (code === 1) return "Location permission denied. Enable GPS to check in.";
    if (code === 2) return "Could not read GPS. Move to open sky and try again.";
    if (code === 3) return "GPS timed out. Try again.";
  }
  if (err instanceof Error) {
    if (/minified react error/i.test(err.message)) {
      return "Check-in failed. Keep this page open and try Confirm again.";
    }
    return err.message;
  }
  return "Check-in failed.";
}

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
      // 100 m jetty radius does not need high-accuracy GPS (faster on phones).
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  });
}

async function openRearCamera(): Promise<MediaStream> {
  const attempts: MediaStreamConstraints[] = [
    {
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 15, max: 20 },
      },
    },
    {
      audio: false,
      video: { facingMode: { ideal: "environment" } },
    },
    { audio: false, video: true },
  ];
  let last: unknown;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      last = err;
    }
  }
  throw last instanceof Error ? last : new Error("Could not open camera.");
}

export function ScannerPanel({
  isAdmin = false,
  requireJettyGps = true,
}: {
  isAdmin?: boolean;
  requireJettyGps?: boolean;
}) {
  const [token, setToken] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [mobileUi, setMobileUi] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectTimer = useRef<number | null>(null);
  const startingRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const jsQrRef = useRef<JsQrFn | null>(null);
  const pausedRef = useRef(false);
  const holdUntilRef = useRef(0);
  const lastTokenRef = useRef("");
  const cameraBoxRef = useRef<HTMLDivElement>(null);
  const verifyRef = useRef<HTMLDivElement>(null);

  const busy = loadingPreview || confirming;

  function clearDetectTimer() {
    if (detectTimer.current) {
      window.clearTimeout(detectTimer.current);
      detectTimer.current = null;
    }
  }

  function scheduleDetect(tick: () => void, ms: number) {
    clearDetectTimer();
    detectTimer.current = window.setTimeout(tick, ms);
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

  function pauseDecoding(ms = 0) {
    pausedRef.current = true;
    if (ms > 0) {
      holdUntilRef.current = Date.now() + ms;
    }
  }

  function resumeDecoding(delayMs = 900) {
    lastTokenRef.current = "";
    holdUntilRef.current = Date.now() + delayMs;
    pausedRef.current = false;
  }

  function scrollTo(el: HTMLElement | null) {
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function loadPreview(raw: string) {
    setError(null);
    setLoadingPreview(true);
    try {
      const res = await actionPreviewPassToken(raw);
      if (!res) {
        setPreview(null);
        setError("Pass QR not found.");
        resumeDecoding(600);
        return;
      }
      setPreview(res);
      window.setTimeout(() => scrollTo(verifyRef.current), 50);
    } catch (err) {
      setPreview(null);
      setError(formatScanError(err));
      resumeDecoding(600);
    } finally {
      setLoadingPreview(false);
    }
  }

  function onDecoded(value: string) {
    const decoded = value.trim();
    if (!decoded) return;
    if (pausedRef.current) return;
    if (Date.now() < holdUntilRef.current) return;
    if (decoded === lastTokenRef.current) return;
    lastTokenRef.current = decoded;
    pauseDecoding();
    setToken(decoded);
    void loadPreview(decoded);
  }

  function drawScanFrame(video: HTMLVideoElement): ImageData | null {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx || video.videoWidth < 8) return null;

    const srcW = video.videoWidth;
    const srcH = video.videoHeight;
    const crop = 0.96;
    const cw = srcW * crop;
    const ch = srcH * crop;
    const sx = (srcW - cw) / 2;
    const sy = (srcH - ch) / 2;
    const maxW = 480;
    const scale = Math.min(1, maxW / cw);
    const dw = Math.max(1, Math.round(cw * scale));
    const dh = Math.max(1, Math.round(ch * scale));
    if (canvas.width !== dw || canvas.height !== dh) {
      canvas.width = dw;
      canvas.height = dh;
    }
    ctx.drawImage(video, sx, sy, cw, ch, 0, 0, dw, dh);
    return ctx.getImageData(0, 0, dw, dh);
  }

  async function startJsQrLoop() {
    if (!jsQrRef.current) {
      const { default: jsQR } = await import("jsqr");
      jsQrRef.current = jsQR;
    }
    const tick = () => {
      if (!streamRef.current) return;
      if (pausedRef.current || Date.now() < holdUntilRef.current) {
        scheduleDetect(tick, 400);
        return;
      }
      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        scheduleDetect(tick, 280);
        return;
      }
      const frame = drawScanFrame(video);
      const jsQR = jsQrRef.current;
      if (frame && jsQR) {
        const code =
          jsQR(frame.data, frame.width, frame.height, {
            inversionAttempts: "dontInvert",
          }) ??
          jsQR(frame.data, frame.width, frame.height, {
            inversionAttempts: "onlyInvert",
          });
        const value = code?.data?.trim();
        if (value) {
          onDecoded(value);
          scheduleDetect(tick, 400);
          return;
        }
      }
      scheduleDetect(tick, 420);
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
      if (pausedRef.current || Date.now() < holdUntilRef.current) {
        scheduleDetect(() => void tick(), 400);
        return;
      }
      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        scheduleDetect(() => void tick(), 280);
        return;
      }
      void detector
        .detect(video)
        .then((codes) => {
          const value = codes[0]?.rawValue?.trim();
          if (value) onDecoded(value);
          scheduleDetect(() => void tick(), 380);
        })
        .catch(() => {
          scheduleDetect(() => void tick(), 420);
        });
    };
    tick();
  }

  async function startCamera() {
    if (startingRef.current || streamRef.current) return;
    startingRef.current = true;
    setError(null);
    try {
      const stream = await openRearCamera();
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
        await startJsQrLoop();
      }
    } catch {
      setError("Could not open camera. Check permissions or paste the token.");
      setCameraOn(false);
    } finally {
      startingRef.current = false;
    }
  }

  function scanAnother() {
    setPreview(null);
    setToken("");
    setError(null);
    resumeDecoding(700);
    scrollTo(cameraBoxRef.current);
    if (!streamRef.current) void startCamera();
  }

  async function confirmScan() {
    if (!token.trim() || confirming) return;
    setError(null);
    setConfirming(true);
    try {
      let coords: { lat?: string; lng?: string } = {};
      if (!isAdmin && requireJettyGps) {
        coords = await getPosition();
      }
      const res = await actionScanToken(token, coords);
      if (res.kind === "pass") {
        toast.success(res.action === "CHECK_IN" ? "Checked in" : "Checked out");
      } else {
        toast.success(
          res.action === "CHECK_IN" ? "Checked in (legacy)" : "Checked out",
        );
      }
      setPreview(null);
      setToken("");
      resumeDecoding(1100);
      scrollTo(cameraBoxRef.current);
      if (!streamRef.current) void startCamera();
    } catch (err) {
      setError(formatScanError(err));
    } finally {
      setConfirming(false);
    }
  }

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!cameraOn || !video || !stream) return;
    video.srcObject = stream;
    video.setAttribute("playsinline", "true");
    video.setAttribute("webkit-playsinline", "true");
    void video.play().catch(() => {
      /* autoplay may need a gesture on some desktops */
    });
  }, [cameraOn]);

  useEffect(() => {
    const mobile = prefersMobileScanner();
    const id = window.setTimeout(() => {
      setMobileUi(mobile);
      if (mobile) void startCamera();
    }, 0);
    return () => {
      window.clearTimeout(id);
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only auto-start
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="px-4 pt-4 sm:px-5 sm:pt-5">
          <CardTitle className="text-base">Scan fishing pass QR</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-4 sm:px-5">
          <div
            ref={cameraBoxRef}
            className="relative overflow-hidden rounded-lg bg-black"
          >
            <video
              ref={videoRef}
              className={
                cameraOn
                  ? "aspect-[4/3] max-h-[48vh] w-full object-cover sm:aspect-video"
                  : "hidden"
              }
              muted
              playsInline
              autoPlay
            />
            {!cameraOn ? (
              <div className="flex aspect-[4/3] max-h-[48vh] w-full flex-col items-center justify-center gap-3 bg-muted px-4 sm:aspect-video">
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
                <p className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/55 to-transparent px-3 py-2 text-center text-xs text-white">
                  {preview
                    ? "Camera on — confirm below, then scan the next pass"
                    : loadingPreview
                      ? "Reading pass…"
                      : "Point the camera at the pass QR"}
                </p>
                <div className="pointer-events-none absolute inset-[4%] rounded-md border-2 border-white/80" />
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
          {isAdmin || !requireJettyGps ? (
            <p className="text-xs text-muted-foreground">
              {isAdmin
                ? "Admin scan: jetty geofence bypassed."
                : "Testing: jetty GPS check is off in Settings."}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              GPS is required. You must be at your registered jetty.
            </p>
          )}
        </CardContent>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Scan error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {preview ? (
        <div ref={verifyRef} className="scroll-mt-4">
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
                  <dd className="font-mono">
                    ****{preview.myKadLast4 ?? "----"}
                  </dd>
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
            <CardFooter className="flex flex-col gap-2 border-t px-4 py-4 sm:flex-row sm:justify-end sm:px-5">
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full sm:w-auto"
                disabled={busy}
                onClick={scanAnother}
              >
                Scan another
              </Button>
              <Button
                type="button"
                className="min-h-11 w-full sm:w-auto"
                disabled={busy || !preview.nextAction}
                onClick={() => void confirmScan()}
              >
                {confirming
                  ? "Working…"
                  : preview.nextAction === "CHECK_OUT"
                    ? "Confirm check-out"
                    : "Confirm check-in"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      ) : token.trim() ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full"
          disabled={busy || !token.trim()}
          onClick={() => {
            pauseDecoding();
            void loadPreview(token);
          }}
        >
          {loadingPreview ? "Loading…" : "Preview pass"}
        </Button>
      ) : null}
    </div>
  );
}
