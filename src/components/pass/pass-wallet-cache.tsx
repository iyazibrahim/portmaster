"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { StatusBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ux/empty-state";
import { PageSkeleton } from "@/components/ux/skeleton-list";
import {
  getPassWallet,
  savePassWallet,
  type PassWalletSnapshot,
} from "@/lib/offline/pass-wallet";
import { warmPassShell } from "@/lib/offline/warm-cache";
import { useT } from "@/i18n/locale-provider";
import { WifiOff } from "lucide-react";

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
  const { t } = useT();
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

  if (!cached?.syncedAt) {
    return <Skeleton className="h-8 w-full max-w-xs" />;
  }

  const syncedLabel = new Date(cached.syncedAt).toLocaleString();

  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm leading-normal text-muted-foreground">
        {t("pass.sync")}
      </span>
      <StatusBadge
        status="AVAILABLE"
        label={t("pass.offlineReady")}
        className="min-w-0 max-w-[14rem] truncate"
        title={t("pass.savedOffline", { when: syncedLabel })}
      />
    </div>
  );
}

/** Full offline fallback UI when the pass page cannot load from the network. */
export function OfflinePassWalletView({ passId }: { passId: string }) {
  const { t } = useT();
  const [snap, setSnap] = useState<PassWalletSnapshot | null | undefined>(
    undefined,
  );

  useEffect(() => {
    void getPassWallet(passId).then(setSnap);
  }, [passId]);

  if (snap === undefined) {
    return <PageSkeleton className="max-w-lg" />;
  }
  if (!snap) {
    return (
        <EmptyState
          icon={WifiOff}
          title={t("pass.offlineMissing")}
          actionLabel={t("common.retry")}
          onAction={() => window.location.reload()}
        />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold tracking-tight">
          {t("pass.offlineTitle")}
        </h1>
        <p className="text-sm leading-normal text-muted-foreground">
          {snap.reference}
        </p>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-muted-foreground">{t("common.status")}</span>
        <StatusBadge status={snap.status} />
      </div>
      {snap.qrToken &&
      (snap.status === "ACTIVE" || snap.status === "CHECKED_IN") ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border bg-white p-4">
          <QRCodeSVG value={snap.qrToken} size={220} level="M" />
          <p className="text-center text-xs leading-normal text-muted-foreground">
            {t("pass.offlineStale", {
              when: new Date(snap.syncedAt).toLocaleString(),
            })}
          </p>
          <code className="max-w-full break-all text-center text-xs text-muted-foreground">
            {snap.qrToken}
          </code>
        </div>
      ) : (
        <p className="text-sm leading-normal text-muted-foreground">
          {t("pass.offlineNoQr")}
        </p>
      )}
      <dl className="grid gap-2 text-sm">
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">{t("common.jetty")}</dt>
          <dd className="font-medium">{snap.jettyName}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">{t("pass.pillar")}</dt>
          <dd className="font-medium">{snap.pillarName}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">{t("pass.fee")}</dt>
          <dd className="font-medium">{formatMYRClient(snap.feeCents)}</dd>
        </div>
      </dl>
    </div>
  );
}
