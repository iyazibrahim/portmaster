import { idbReq, idbTxDone, openIdb } from "@/lib/offline/idb";

const DB_NAME = "tiangpass-offline";
const DB_VERSION = 1;
const STORE = "pass_wallet";

export type PassWalletSnapshot = {
  passId: string;
  reference: string;
  status: string;
  validOn: string;
  jettyName: string;
  pillarName: string;
  qrToken: string | null;
  feeCents: number;
  syncedAt: string;
};

async function db() {
  return openIdb(DB_NAME, DB_VERSION, (database) => {
    if (!database.objectStoreNames.contains("scan_queue")) {
      database.createObjectStore("scan_queue", { keyPath: "clientEventId" });
    }
    if (!database.objectStoreNames.contains(STORE)) {
      database.createObjectStore(STORE, { keyPath: "passId" });
    }
    if (!database.objectStoreNames.contains("boarding_manifest")) {
      database.createObjectStore("boarding_manifest", { keyPath: "key" });
    }
  });
}

export async function savePassWallet(snapshot: PassWalletSnapshot) {
  const database = await db();
  const tx = database.transaction(STORE, "readwrite");
  tx.objectStore(STORE).put(snapshot);
  await idbTxDone(tx);
}

export async function getPassWallet(
  passId: string,
): Promise<PassWalletSnapshot | null> {
  const database = await db();
  const tx = database.transaction(STORE, "readonly");
  const row = await idbReq<PassWalletSnapshot | undefined>(
    tx.objectStore(STORE).get(passId),
  );
  return row ?? null;
}

export async function listPassWallet(): Promise<PassWalletSnapshot[]> {
  const database = await db();
  const tx = database.transaction(STORE, "readonly");
  return idbReq(tx.objectStore(STORE).getAll());
}
