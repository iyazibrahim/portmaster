"use client";

import { useEffect, useRef, useState } from "react";
import {
  actionPreviewPassToken,
  actionScanToken,
} from "@/lib/actions/booking";
import {
  actionFetchBoardingManifest,
  actionSyncOfflineScans,
} from "@/lib/actions/offline";
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
import { cn } from "@/lib/utils";
import {
  SCAN_REQUEST_TIMEOUT_MS,
  countPendingScans,
  enqueueScan,
  isNetworkError,
  listPendingScans,
  newClientEventId,
  updateQueuedScan,
  withTimeout,
} from "@/lib/offline/scan-queue";
import {
  findManifestPass,
  getBoardingManifest,
  patchManifestPassStatus,
  saveBoardingManifest,
  type BoardingManifest,
} from "@/lib/offline/boarding-manifest";
import { applyLocalScan, previewLocalPass } from "@/lib/offline/local-scan";
import { warmOperatorShell } from "@/lib/offline/warm-cache";

type Preview = {
  passId: string;
  reference: string;
  status: string;
  validOn: string;
  anglerName: string;
  myKadLast4: string | null;
  photoKey: string | null;
  photoDataUrl?: string | null;
  pillarName: string;
  jettyName: string;
  nextAction: "CHECK_IN" | "CHECK_OUT" | null;
  fromOfflineCache?: boolean;
};

type JsQrFn = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options?: { inversionAttempts?: "dontInvert" | "attemptBoth" | "onlyInvert" },
) => { data: string } | null;

/** Keep tracks warm across tab hops so Open camera does not re-prompt. */
const CAMERA_RELEASE_MS = 30 * 60_000;
/** Reliable timer decode — do not depend on requestVideoFrameCallback alone. */
const DECODE_INTERVAL_MS = 100;
const VIDEO_READY_TIMEOUT_MS = 10_000;
const WARMUP_MS = 450;

const cameraHub = {
  stream: null as MediaStream | null,
  releaseTimer: null as number | null,
  consumers: 0,
  openPromise: null as Promise<MediaStream> | null,

  cancelRelease() {
    if (this.releaseTimer != null) {
      window.clearTimeout(this.releaseTimer);
      this.releaseTimer = null;
    }
  },

  liveStream(): MediaStream | null {
    const stream = this.stream;
    if (!stream) return null;
    const live = stream.getTracks().some((t) => t.readyState === "live");
    if (!live) {
      this.stream = null;
      return null;
    }
    return stream;
  },

  attach(stream: MediaStream) {
    this.cancelRelease();
    if (this.stream && this.stream !== stream) {
      this.stream.getTracks().forEach((t) => t.stop());
    }
    this.stream = stream;
    this.consumers += 1;
    return stream;
  },

  releaseSoft() {
    this.consumers = Math.max(0, this.consumers - 1);
    if (this.consumers > 0) return;
    this.cancelRelease();
    this.releaseTimer = window.setTimeout(() => {
      this.releaseTimer = null;
      if (this.consumers > 0) return;
      this.stream?.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }, CAMERA_RELEASE_MS);
  },

  releaseHard() {
    this.cancelRelease();
    this.consumers = 0;
    this.openPromise = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  },
};

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
  if (typeof err === "string" && err.trim()) return err;
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
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  });
}

async function applyScanTrackTweaks(stream: MediaStream) {
  for (const track of stream.getVideoTracks()) {
    try {
      const caps = track.getCapabilities?.() as
        | {
            focusMode?: string[];
            zoom?: { min: number; max: number };
          }
        | undefined;
      const advanced: Record<string, unknown>[] = [];
      if (caps?.focusMode?.includes("continuous")) {
        advanced.push({ focusMode: "continuous" });
      }
      const constraints: MediaTrackConstraints = {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 24, max: 30 },
      };
      if (advanced.length > 0) {
        (constraints as MediaTrackConstraints & { advanced?: unknown[] }).advanced =
          advanced;
      }
      await track.applyConstraints(constraints);
    } catch {
      try {
        await track.applyConstraints({
          width: { ideal: 1280 },
          height: { ideal: 720 },
        });
      } catch {
        /* keep whatever getUserMedia gave us */
      }
    }
  }
}

async function openRearCamera(forceNew = false): Promise<MediaStream> {
  if (!forceNew) {
    const existing = cameraHub.liveStream();
    if (existing) {
      cameraHub.cancelRelease();
      cameraHub.consumers += 1;
      return existing;
    }

    if (cameraHub.openPromise) {
      const shared = await cameraHub.openPromise;
      cameraHub.cancelRelease();
      cameraHub.consumers += 1;
      return shared;
    }
  } else {
    cameraHub.releaseHard();
  }

  const attempts: MediaStreamConstraints[] = [
    {
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 24, max: 30 },
      },
    },
    {
      audio: false,
      video: {
        facingMode: { exact: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    },
    {
      audio: false,
      video: { facingMode: { ideal: "environment" } },
    },
    { audio: false, video: true },
  ];

  cameraHub.openPromise = (async () => {
    let last: unknown;
    for (const constraints of attempts) {
      try {
        return await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        last = err;
        if (
          err &&
          typeof err === "object" &&
          "name" in err &&
          (err as { name: string }).name === "NotAllowedError"
        ) {
          break;
        }
      }
    }
    throw last instanceof Error ? last : new Error("Could not open camera.");
  })();

  try {
    const stream = await cameraHub.openPromise;
    return cameraHub.attach(stream);
  } finally {
    cameraHub.openPromise = null;
  }
}

function frameLooksLive(data: ImageData): boolean {
  // Reject all-black / near-black warmup frames (common on first Open).
  const step = Math.max(4, Math.floor(data.data.length / 400) * 4);
  let bright = 0;
  let samples = 0;
  for (let i = 0; i < data.data.length; i += step) {
    const r = data.data[i] ?? 0;
    const g = data.data[i + 1] ?? 0;
    const b = data.data[i + 2] ?? 0;
    if (r + g + b > 40) bright += 1;
    samples += 1;
  }
  return samples > 0 && bright / samples > 0.02;
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
  const [scanning, setScanning] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [pullingManifest, setPullingManifest] = useState(false);
  const [manifestMeta, setManifestMeta] = useState<{
    fetchedAt: string;
    passCount: number;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const decodeTimer = useRef<number | null>(null);
  const decodeLoopGen = useRef(0);
  const startingRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const jsQrRef = useRef<JsQrFn | null>(null);
  const pausedRef = useRef(false);
  const holdUntilRef = useRef(0);
  const lastTokenRef = useRef("");
  const decodingBusyRef = useRef(false);
  const cameraBoxRef = useRef<HTMLDivElement>(null);
  const verifyRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);
  const cameraGenRef = useRef(0);
  const syncingRef = useRef(false);
  const manifestRef = useRef<BoardingManifest | null>(null);

  const busy = loadingPreview || confirming;

  function isStreamLive() {
    const stream = streamRef.current;
    if (!stream) return false;
    return stream
      .getVideoTracks()
      .some((t) => t.readyState === "live" && t.enabled);
  }

  function bindStreamHandlers(stream: MediaStream) {
    stream.getVideoTracks().forEach((track) => {
      track.onended = () => {
        if (streamRef.current !== stream) return;
        stopCamera();
        setError("Camera stopped. Tap Open camera to scan again.");
      };
    });
  }

  function stopDecodeLoops() {
    decodeLoopGen.current += 1;
    decodingBusyRef.current = false;
    if (decodeTimer.current != null) {
      window.clearInterval(decodeTimer.current);
      decodeTimer.current = null;
    }
    if (mountedRef.current) setScanning(false);
  }

  function detachVideo() {
    stopDecodeLoops();
    streamRef.current = null;
    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch {
        /* ignore */
      }
      videoRef.current.srcObject = null;
    }
    setCameraOn(false);
  }

  function stopCameraHard() {
    detachVideo();
    cameraHub.releaseHard();
  }

  function stopCamera() {
    detachVideo();
    cameraHub.releaseSoft();
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

  async function waitForVideoReady(
    video: HTMLVideoElement,
    gen: number,
  ): Promise<void> {
    const deadline = Date.now() + VIDEO_READY_TIMEOUT_MS;
    while (Date.now() < deadline) {
      if (!mountedRef.current || gen !== cameraGenRef.current) {
        throw new Error("Camera open cancelled.");
      }
      if (
        !video.paused &&
        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        video.videoWidth >= 16
      ) {
        return;
      }
      await new Promise((r) => window.setTimeout(r, 40));
    }
    throw new Error("Camera preview did not start. Tap Open camera again.");
  }

  async function bindStreamToVideo(
    stream: MediaStream,
    gen: number,
  ): Promise<HTMLVideoElement> {
    const video = videoRef.current;
    if (!video) {
      throw new Error("Camera preview is not ready. Tap Open camera again.");
    }
    video.setAttribute("playsinline", "true");
    video.setAttribute("webkit-playsinline", "true");
    video.muted = true;
    video.playsInline = true;
    // Always re-assign so the element restarts the decoder pipeline.
    if (video.srcObject) {
      video.srcObject = null;
    }
    video.srcObject = stream;
    try {
      await video.play();
    } catch {
      // One retry after a paint — some WebViews need the element visible first.
      await new Promise((r) => requestAnimationFrame(() => r(undefined)));
      await video.play();
    }
    await waitForVideoReady(video, gen);
    // Let AE/AF settle and skip black warmup frames.
    await new Promise((r) => window.setTimeout(r, WARMUP_MS));
    if (!mountedRef.current || gen !== cameraGenRef.current) {
      throw new Error("Camera open cancelled.");
    }
    try {
      await video.play();
    } catch {
      /* already playing */
    }
    return video;
  }

  async function refreshPendingCount() {
    try {
      const n = await countPendingScans();
      if (mountedRef.current) setPendingCount(n);
    } catch {
      /* ignore */
    }
  }

  async function refreshManifestMeta() {
    try {
      const m = await getBoardingManifest();
      manifestRef.current = m;
      if (!mountedRef.current) return;
      if (m) {
        setManifestMeta({
          fetchedAt: m.fetchedAt,
          passCount: m.passes.length,
        });
      }
    } catch {
      /* ignore */
    }
  }

  async function pullManifest() {
    if (pullingManifest) return;
    setPullingManifest(true);
    try {
      const res = await withTimeout(
        actionFetchBoardingManifest(),
        SCAN_REQUEST_TIMEOUT_MS,
      );
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const saved = await saveBoardingManifest(res.manifest);
      manifestRef.current = saved;
      if (mountedRef.current) {
        setManifestMeta({
          fetchedAt: saved.fetchedAt,
          passCount: saved.passes.length,
        });
      }
      warmOperatorShell();
      toast.success(`Offline pack ready (${saved.passes.length} passes)`);
    } catch (err) {
      if (isNetworkError(err)) {
        toast.message("Could not refresh offline pack — using last download.");
      } else {
        toast.error(formatScanError(err));
      }
    } finally {
      if (mountedRef.current) setPullingManifest(false);
    }
  }

  async function flushScanQueue() {
    if (syncingRef.current) return;
    syncingRef.current = true;
    if (mountedRef.current) setSyncing(true);
    try {
      const pending = await listPendingScans();
      if (pending.length === 0) {
        await refreshPendingCount();
        return;
      }
      const res = await withTimeout(
        actionSyncOfflineScans(
          pending.map((p) => ({
            clientEventId: p.clientEventId,
            token: p.token,
            expectedAction: p.expectedAction,
            lat: p.lat,
            lng: p.lng,
            scannedAt: p.createdAt,
          })),
        ),
        SCAN_REQUEST_TIMEOUT_MS * 2,
      );
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      let synced = 0;
      let conflicts = 0;
      for (const r of res.results) {
        if (r.status === "synced") {
          await updateQueuedScan(r.clientEventId, { status: "synced" });
          synced += 1;
        } else if (r.status === "conflict") {
          await updateQueuedScan(r.clientEventId, {
            status: "conflict",
            lastError: "Conflict — admin review needed",
          });
          conflicts += 1;
        } else {
          await updateQueuedScan(r.clientEventId, {
            status: "failed",
            lastError: r.error ?? "Sync failed",
          });
        }
      }
      if (synced) toast.success(`Synced ${synced} queued scan(s)`);
      if (conflicts) toast.message(`${conflicts} conflict(s) for admin review`);
      await refreshPendingCount();
    } catch (err) {
      if (!isNetworkError(err)) toast.error(formatScanError(err));
    } finally {
      syncingRef.current = false;
      if (mountedRef.current) setSyncing(false);
    }
  }

  async function loadPreview(raw: string) {
    setError(null);
    setLoadingPreview(true);
    try {
      try {
        const res = await withTimeout(
          actionPreviewPassToken(raw),
          SCAN_REQUEST_TIMEOUT_MS,
        );
        if (!mountedRef.current) return;
        if (res.ok) {
          setPreview(res.preview);
          window.setTimeout(() => scrollTo(verifyRef.current), 50);
          return;
        }
        // Fall through to local manifest on not-found only if offline path available
        const manifest =
          manifestRef.current ?? (await getBoardingManifest());
        const local = manifest ? findManifestPass(manifest, raw) : null;
        if (local) {
          setPreview({ ...previewLocalPass(local), fromOfflineCache: true });
          window.setTimeout(() => scrollTo(verifyRef.current), 50);
          return;
        }
        setPreview(null);
        setError(res.error);
        resumeDecoding(600);
        return;
      } catch (err) {
        if (!isNetworkError(err)) throw err;
        const manifest =
          manifestRef.current ?? (await getBoardingManifest());
        const local = manifest ? findManifestPass(manifest, raw) : null;
        if (!local) {
          setPreview(null);
          setError(
            "Offline and pass not in local pack. Connect once and tap Refresh offline pack.",
          );
          resumeDecoding(600);
          return;
        }
        setPreview({ ...previewLocalPass(local), fromOfflineCache: true });
        window.setTimeout(() => scrollTo(verifyRef.current), 50);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setPreview(null);
      setError(formatScanError(err));
      resumeDecoding(600);
    } finally {
      if (mountedRef.current) setLoadingPreview(false);
    }
  }

  async function confirmOffline(
    coords: { lat?: string; lng?: string },
    clientEventId: string,
  ) {
    const manifest = manifestRef.current ?? (await getBoardingManifest());
    if (!manifest) {
      throw new Error(
        "No offline pack. Connect and tap Refresh offline pack, then try again.",
      );
    }
    const local = findManifestPass(manifest, token);
    if (!local) {
      throw new Error("Pass not in offline pack.");
    }
    const result = applyLocalScan({
      pass: local,
      isAdmin,
      requireJettyGps: manifest.requireJettyGps,
      handlerJettyId: manifest.handlerJettyId,
      coords,
    });
    if (!result.ok) throw new Error(result.error);

    await enqueueScan({
      clientEventId,
      token: token.trim(),
      expectedAction: result.action,
      lat: coords.lat,
      lng: coords.lng,
      appliedLocally: true,
      passId: result.preview.passId,
      reference: result.preview.reference,
    });
    await patchManifestPassStatus(token, result.nextStatus);
    manifestRef.current = await getBoardingManifest();
    await refreshPendingCount();
    toast.success(
      result.action === "CHECK_IN"
        ? "Checked in (queued offline)"
        : "Checked out (queued offline)",
    );
    await readyForNextScan();
  }

  async function confirmScan() {
    if (!token.trim() || confirming) return;
    setError(null);
    setConfirming(true);
    const clientEventId = newClientEventId();
    const expectedAction = preview?.nextAction ?? undefined;
    try {
      let coords: { lat?: string; lng?: string } = {};
      if (!isAdmin && requireJettyGps) {
        coords = await getPosition();
      }

      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        await confirmOffline(coords, clientEventId);
        return;
      }

      try {
        const res = await withTimeout(
          actionScanToken(token, coords, clientEventId, expectedAction),
          SCAN_REQUEST_TIMEOUT_MS,
        );
        if (!mountedRef.current) return;
        if (!res.ok) {
          setError(res.error);
          return;
        }
        if (res.kind === "pass") {
          await patchManifestPassStatus(token, res.status);
          toast.success(
            res.alreadyApplied
              ? "Already recorded"
              : res.action === "CHECK_IN"
                ? "Checked in"
                : "Checked out",
          );
        } else {
          toast.success(
            res.action === "CHECK_IN" ? "Checked in (legacy)" : "Checked out",
          );
        }
        await readyForNextScan();
      } catch (err) {
        if (!isNetworkError(err)) throw err;
        await confirmOffline(coords, clientEventId);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setError(formatScanError(err));
      if (preview) resumeDecoding(600);
    } finally {
      if (mountedRef.current) setConfirming(false);
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
    if (!ctx || video.videoWidth < 16) return null;

    const srcW = video.videoWidth;
    const srcH = video.videoHeight;
    // Wider crop — pass QR often fills most of the guide box.
    const crop = 0.92;
    const cw = srcW * crop;
    const ch = srcH * crop;
    const sx = (srcW - cw) / 2;
    const sy = (srcH - ch) / 2;
    const maxW = 640;
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

  async function ensureJsQr(): Promise<JsQrFn | null> {
    if (jsQrRef.current) return jsQrRef.current;
    try {
      const { default: jsQR } = await import("jsqr");
      jsQrRef.current = jsQR;
      return jsQR;
    } catch {
      return null;
    }
  }

  function runDecodeOnce(loopGen: number) {
    if (loopGen !== decodeLoopGen.current) return;
    if (!streamRef.current || !mountedRef.current) return;
    if (decodingBusyRef.current) return;
    if (pausedRef.current || Date.now() < holdUntilRef.current) return;

    const video = videoRef.current;
    if (
      !video ||
      video.paused ||
      video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
      video.videoWidth < 16
    ) {
      void video?.play().catch(() => {});
      return;
    }

    decodingBusyRef.current = true;
    void (async () => {
      try {
        const jsQR = await ensureJsQr();
        if (loopGen !== decodeLoopGen.current || !jsQR) return;

        const frame = drawScanFrame(video);
        if (!frame || !frameLooksLive(frame)) return;

        const code = jsQR(frame.data, frame.width, frame.height, {
          inversionAttempts: "attemptBoth",
        });
        const value = code?.data?.trim();
        if (value) onDecoded(value);
      } finally {
        if (loopGen === decodeLoopGen.current) {
          decodingBusyRef.current = false;
        }
      }
    })();
  }

  function startDecodeLoops() {
    stopDecodeLoops();
    const loopGen = decodeLoopGen.current;
    // Preload jsQR so the first ticks are not blocked on dynamic import.
    void ensureJsQr();
    setScanning(true);
    // Interval is the source of truth — never rely on rVFC alone (can stall).
    decodeTimer.current = window.setInterval(() => {
      runDecodeOnce(loopGen);
    }, DECODE_INTERVAL_MS);
    // Immediate first attempt after warm-up already waited.
    runDecodeOnce(loopGen);
  }

  async function prepareLiveCamera(stream: MediaStream, gen: number) {
    streamRef.current = stream;
    bindStreamHandlers(stream);
    await applyScanTrackTweaks(stream);
    if (!mountedRef.current || gen !== cameraGenRef.current) {
      throw new Error("Camera open cancelled.");
    }

    // Show the video element first so play()/frames are not blocked by opacity:0.
    setCameraOn(true);
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));
    if (!mountedRef.current || gen !== cameraGenRef.current) {
      throw new Error("Camera open cancelled.");
    }

    await bindStreamToVideo(stream, gen);
    if (!mountedRef.current || gen !== cameraGenRef.current) {
      throw new Error("Camera open cancelled.");
    }
    startDecodeLoops();
  }

  async function startCamera(opts?: { forceNew?: boolean }) {
    if (startingRef.current) return;
    const gen = ++cameraGenRef.current;
    startingRef.current = true;
    setError(null);
    try {
      // Explicit Open always takes a fresh stream — soft-reuse was leaving a
      // preview that looked live but would not decode until Stop → Open.
      const forceNew = opts?.forceNew === true;
      if (forceNew || (streamRef.current && !isStreamLive())) {
        stopCameraHard();
      }

      let stream =
        !forceNew && streamRef.current && isStreamLive()
          ? streamRef.current
          : null;
      if (!stream) {
        stream = await openRearCamera(forceNew);
      }

      if (!mountedRef.current || gen !== cameraGenRef.current) {
        if (stream !== cameraHub.liveStream()) {
          stream.getTracks().forEach((t) => t.stop());
        }
        cameraHub.releaseSoft();
        return;
      }

      await prepareLiveCamera(stream, gen);
    } catch (err) {
      if (!mountedRef.current || gen !== cameraGenRef.current) return;
      stopDecodeLoops();
      setCameraOn(false);
      setError(
        err instanceof Error
          ? err.message
          : "Could not open camera. Check permissions or paste the token.",
      );
    } finally {
      if (gen === cameraGenRef.current) startingRef.current = false;
    }
  }

  async function ensureLiveCamera() {
    if (startingRef.current) return;
    const gen = ++cameraGenRef.current;
    startingRef.current = true;
    setError(null);
    try {
      if (isStreamLive() && streamRef.current) {
        await prepareLiveCamera(streamRef.current, gen);
        return;
      }
      startingRef.current = false;
      stopCameraHard();
      await startCamera({ forceNew: true });
    } catch (err) {
      if (!mountedRef.current || gen !== cameraGenRef.current) return;
      setError(
        err instanceof Error
          ? err.message
          : "Could not reopen camera. Tap Open camera.",
      );
    } finally {
      if (gen === cameraGenRef.current) startingRef.current = false;
    }
  }

  async function readyForNextScan() {
    setPreview(null);
    setToken("");
    setError(null);
    resumeDecoding(700);
    scrollTo(cameraBoxRef.current);
    await ensureLiveCamera();
  }

  function scanAnother() {
    void readyForNextScan();
  }

  useEffect(() => {
    mountedRef.current = true;
    warmOperatorShell();
    // Defer IndexedDB / network bootstrap so we don't sync-setState in effect body.
    const bootId = window.setTimeout(() => {
      void refreshPendingCount();
      void refreshManifestMeta();
      void pullManifest();
      void flushScanQueue();
    }, 0);

    const existing = cameraHub.liveStream();
    let resumeId: number | undefined;
    if (existing) {
      cameraHub.cancelRelease();
      cameraHub.consumers += 1;
      streamRef.current = existing;
      bindStreamHandlers(existing);
      resumeId = window.setTimeout(() => {
        // Remount: reuse warm stream but rebind + restart decode.
        if (mountedRef.current) void startCamera({ forceNew: false });
      }, 0);
    }

    function onOnline() {
      void flushScanQueue();
    }
    window.addEventListener("online", onOnline);

    return () => {
      mountedRef.current = false;
      window.clearTimeout(bootId);
      window.removeEventListener("online", onOnline);
      if (resumeId != null) window.clearTimeout(resumeId);
      cameraGenRef.current += 1;
      detachVideo();
      cameraHub.releaseSoft();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only hub reattach
  }, []);

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState !== "visible" || !cameraOn) return;
      void ensureLiveCamera();
      void flushScanQueue();
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ensureLiveCamera stable enough
  }, [cameraOn]);

  return (
    <div className="flex flex-col gap-4">
      {(pendingCount > 0 || manifestMeta) && (
        <Alert>
          <AlertTitle>Offline boarding</AlertTitle>
          <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm">
              {pendingCount > 0
                ? `${pendingCount} scan(s) waiting to sync.`
                : "Queue clear."}{" "}
              {manifestMeta
                ? `Pack: ${manifestMeta.passCount} passes · ${new Date(manifestMeta.fetchedAt).toLocaleTimeString()}`
                : "No offline pack yet."}
            </span>
            <span className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pullingManifest}
                onClick={() => void pullManifest()}
              >
                {pullingManifest ? "Refreshing…" : "Refresh offline pack"}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={syncing || pendingCount === 0}
                onClick={() => void flushScanQueue()}
              >
                {syncing ? "Syncing…" : "Sync now"}
              </Button>
            </span>
          </AlertDescription>
        </Alert>
      )}

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
              className={cn(
                "aspect-[4/3] max-h-[48vh] w-full bg-black object-cover sm:aspect-video",
                !cameraOn && "pointer-events-none absolute inset-0 opacity-0",
              )}
              muted
              playsInline
              autoPlay
            />
            {!cameraOn ? (
              <div className="relative z-10 flex aspect-[4/3] max-h-[48vh] w-full flex-col items-center justify-center gap-3 bg-muted px-4 sm:aspect-video">
                <p className="text-center text-sm text-muted-foreground">
                  Paste a QR token below to check in without the camera, or open
                  the camera to scan.
                </p>
                <Button
                  type="button"
                  onClick={() => void startCamera({ forceNew: true })}
                >
                  Open camera
                </Button>
              </div>
            ) : (
              <>
                <p className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/55 to-transparent px-3 py-2 text-center text-xs text-white">
                  {preview
                    ? "Camera on — confirm below, then scan the next pass"
                    : loadingPreview
                      ? "Reading pass…"
                      : scanning
                        ? "Scanning… hold the QR inside the box"
                        : "Starting scanner…"}
                </p>
                <div className="pointer-events-none absolute inset-[4%] z-10 rounded-md border-2 border-white/80" />
                <div className="absolute inset-x-0 bottom-0 z-10 flex justify-end bg-gradient-to-t from-black/60 to-transparent p-3">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={stopCameraHard}
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
              GPS is required on Confirm. You must be at your registered jetty.
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
              {preview.photoDataUrl || preview.photoKey ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={
                    preview.photoDataUrl ??
                    photoUrl(preview.photoKey) ??
                    undefined
                  }
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
                {preview.fromOfflineCache ? (
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Showing cached offline pack (may be stale until sync).
                  </p>
                ) : null}
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
