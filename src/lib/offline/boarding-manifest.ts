import { idbReq, idbTxDone, openIdb } from "@/lib/offline/idb";
import { previewLocalPass, type ScanPreview } from "@/lib/offline/local-scan";

const DB_NAME = "tiangpass-offline";
const DB_VERSION = 1;
const STORE = "boarding_manifest";
const MANIFEST_KEY = "current";

export type ManifestPass = {
  passId: string;
  reference: string;
  status: "ACTIVE" | "CHECKED_IN" | string;
  validOn: string;
  token: string;
  tokenExpiresAt: string;
  revokedAt: string | null;
  anglerName: string;
  myKadLast4: string | null;
  photoKey: string | null;
  /** data URL cached when online */
  photoDataUrl: string | null;
  pillarName: string;
  jettyId: string;
  jettyName: string;
  jettyLat: string | null;
  jettyLng: string | null;
  geofenceRadiusM: number;
};

export type BoardingManifest = {
  key: typeof MANIFEST_KEY;
  fetchedAt: string;
  validOn: string;
  handlerJettyId: string | null;
  isAdmin: boolean;
  requireJettyGps: boolean;
  passes: ManifestPass[];
};

async function db() {
  return openIdb(DB_NAME, DB_VERSION, (database) => {
    if (!database.objectStoreNames.contains("scan_queue")) {
      database.createObjectStore("scan_queue", { keyPath: "clientEventId" });
    }
    if (!database.objectStoreNames.contains("pass_wallet")) {
      database.createObjectStore("pass_wallet", { keyPath: "passId" });
    }
    if (!database.objectStoreNames.contains(STORE)) {
      database.createObjectStore(STORE, { keyPath: "key" });
    }
  });
}

export async function saveBoardingManifest(manifest: Omit<BoardingManifest, "key">) {
  const row: BoardingManifest = { ...manifest, key: MANIFEST_KEY };
  const database = await db();
  const tx = database.transaction(STORE, "readwrite");
  tx.objectStore(STORE).put(row);
  await idbTxDone(tx);
  return row;
}

export async function getBoardingManifest(): Promise<BoardingManifest | null> {
  const database = await db();
  const tx = database.transaction(STORE, "readonly");
  const row = await idbReq<BoardingManifest | undefined>(
    tx.objectStore(STORE).get(MANIFEST_KEY),
  );
  return row ?? null;
}

export async function patchManifestPassStatus(
  token: string,
  status: string,
): Promise<void> {
  const manifest = await getBoardingManifest();
  if (!manifest) return;
  const next = {
    ...manifest,
    passes: manifest.passes.map((p) =>
      p.token === token.trim() ? { ...p, status } : p,
    ),
  };
  await saveBoardingManifest(next);
}

export function findManifestPass(
  manifest: BoardingManifest,
  token: string,
): ManifestPass | null {
  const raw = token.trim();
  return manifest.passes.find((p) => p.token === raw) ?? null;
}

export function manifestPassToPreview(pass: ManifestPass): ScanPreview {
  return previewLocalPass(pass);
}
