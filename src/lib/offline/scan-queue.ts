import { idbReq, idbTxDone, openIdb } from "@/lib/offline/idb";

const DB_NAME = "tiangpass-offline";
const DB_VERSION = 1;
const STORE = "scan_queue";

export type QueuedScanStatus = "pending" | "synced" | "failed" | "conflict";

export type QueuedScan = {
  clientEventId: string;
  token: string;
  expectedAction: "CHECK_IN" | "CHECK_OUT";
  lat?: string;
  lng?: string;
  createdAt: string;
  status: QueuedScanStatus;
  lastError?: string;
  /** Set after local offline apply (Phase 2). */
  appliedLocally?: boolean;
  passId?: string;
  reference?: string;
};

async function db() {
  return openIdb(DB_NAME, DB_VERSION, (database) => {
    if (!database.objectStoreNames.contains(STORE)) {
      database.createObjectStore(STORE, { keyPath: "clientEventId" });
    }
    if (!database.objectStoreNames.contains("pass_wallet")) {
      database.createObjectStore("pass_wallet", { keyPath: "passId" });
    }
    if (!database.objectStoreNames.contains("boarding_manifest")) {
      database.createObjectStore("boarding_manifest", { keyPath: "key" });
    }
  });
}

export function newClientEventId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `cev_${crypto.randomUUID().replace(/-/g, "")}`;
  }
  return `cev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

export async function enqueueScan(
  item: Omit<QueuedScan, "status" | "createdAt"> & {
    status?: QueuedScanStatus;
    createdAt?: string;
  },
): Promise<QueuedScan> {
  const row: QueuedScan = {
    ...item,
    status: item.status ?? "pending",
    createdAt: item.createdAt ?? new Date().toISOString(),
  };
  const database = await db();
  const tx = database.transaction(STORE, "readwrite");
  tx.objectStore(STORE).put(row);
  await idbTxDone(tx);
  return row;
}

export async function updateQueuedScan(
  clientEventId: string,
  patch: Partial<QueuedScan>,
): Promise<void> {
  const database = await db();
  const tx = database.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);
  const existing = await idbReq<QueuedScan | undefined>(store.get(clientEventId));
  if (!existing) {
    await idbTxDone(tx);
    return;
  }
  store.put({ ...existing, ...patch, clientEventId });
  await idbTxDone(tx);
}

export async function listPendingScans(): Promise<QueuedScan[]> {
  const database = await db();
  const tx = database.transaction(STORE, "readonly");
  const all = await idbReq<QueuedScan[]>(tx.objectStore(STORE).getAll());
  return all
    .filter((r) => r.status === "pending" || r.status === "failed")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function countPendingScans(): Promise<number> {
  const pending = await listPendingScans();
  return pending.length;
}

export async function listAllQueuedScans(): Promise<QueuedScan[]> {
  const database = await db();
  const tx = database.transaction(STORE, "readonly");
  const all = await idbReq<QueuedScan[]>(tx.objectStore(STORE).getAll());
  return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  if (err instanceof DOMException && err.name === "AbortError") return true;
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /failed to fetch|network|offline|timeout|aborted/i.test(msg);
}

export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new DOMException("Scan request timed out", "AbortError")),
          ms,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export const SCAN_REQUEST_TIMEOUT_MS = 12_000;
