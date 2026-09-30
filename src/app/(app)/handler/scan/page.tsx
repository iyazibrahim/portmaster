import { requireRole } from "@/lib/session";

/**
 * Scanner UI is mounted from the app layout (PersistentHandlerScanner) so the
 * camera stream survives PWA tab hops without re-prompting permission.
 */
export default async function HandlerScanPage() {
  await requireRole(["HANDLER", "ADMIN"]);
  return null;
}
