"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { StatusBadge } from "@/components/status-badge";
import {
  getPassWallet,
  savePassWallet,
  type PassWalletSnapshot,
} from "@/lib/offline/pass-wallet";
import { warmPassShell } from "@/lib/offline/warm-cache";

function formatMYRClient(cents: number) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
  }).format(cents / 100);
}

export type PassWalletCacheProps = {
  passId: string;
  reference: string;
  status: string;
  validOn: string;
  jettyName: string;
  pillarName: string;
  qrToken: string | null;
  feeCents: number;
};

/** Persists pass + QR for offline display; shows cached copy when online fetch fails. */
export function PassWalletCache(props: PassWalletCacheProps) {
  const [cached, setCached] = useState<PassWalletSnapshot | null>(null);

  useEffect(() => {
    const snapshot: PassWalletSnapshot = {
      passId: props.passId,
      reference: props.reference,
      status: props.status,
      validOn: props.validOn,
      jettyName: props.jettyName,
      pillarName: props.pillarName,
      qrToken: props.qrToken,
      feeCents: props.feeCents,
      syncedAt: new Date().toISOString(),
    };
    void savePassWallet(snapshot).then(() => {
      setCached(snapshot);
      warmPassShell(props.passId);
    });
  }, [
    props.passId,
    props.reference,
    props.status,
    props.validOn,
    props.jettyName,
    props.pillarName,
    props.qrToken,
    props.feeCents,
  ]);

  useEffect(() => {
    void getPassWallet(props.passId).then((row) => {
      if (row) setCached(row);
    });
  }, [props.passId]);

  if (!cached?.syncedAt) return null;

  return (
    <p className="text-xs text-muted-foreground">
      Saved for offline · last synced{" "}
      {new Date(cached.syncedAt).toLocaleString()}
    </p>
  );
}

/** Full offline fallback UI when the pass page cannot load from the network. */
export function OfflinePassWalletView({ passId }: { passId: string }) {
  const [snap, setSnap] = useState<PassWalletSnapshot | null | undefined>(
    undefined,
  );

  useEffect(() => {
    void getPassWallet(passId).then(setSnap);
  }, [passId]);

  if (snap === undefined) {
    return (
      <p className="text-sm text-muted-foreground">Loading offline pass…</p>
    );
  }
  if (!snap) {
    return (
      <p className="text-sm text-muted-foreground">
        No offline copy of this pass. Open it once while online to cache the QR.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Fishing pass (offline)
        </h1>
        <p className="text-sm text-muted-foreground">{snap.reference}</p>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Status</span>
        <StatusBadge status={snap.status} />
      </div>
      {snap.qrToken &&
      (snap.status === "ACTIVE" || snap.status === "CHECKED_IN") ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border bg-white p-4">
          <QRCodeSVG value={snap.qrToken} size={220} level="M" />
          <p className="text-center text-xs text-muted-foreground">
            Offline copy — status may be stale. Last synced{" "}
            {new Date(snap.syncedAt).toLocaleString()}.
          </p>
          <code className="max-w-full break-all text-center text-[10px] text-muted-foreground">
            {snap.qrToken}
          </code>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          QR not available for this cached status.
        </p>
      )}
      <dl className="grid gap-2 text-sm">
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Jetty</dt>
          <dd className="font-medium">{snap.jettyName}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Pillar</dt>
          <dd className="font-medium">{snap.pillarName}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Fee</dt>
          <dd className="font-medium">{formatMYRClient(snap.feeCents)}</dd>
        </div>
      </dl>
    </div>
  );
}
