import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { QRCodeSVG } from "qrcode.react";
import Link from "next/link";
import { requireSession } from "@/lib/session";
import { db } from "@/db";
import { jetties, locations, payments, passes, users } from "@/db/schema";
import { getActiveQrToken } from "@/lib/pass";
import { getSettingsMap } from "@/lib/actions/admin";
import { formatEnumLabel, formatMYR } from "@/lib/utils-app";
import { photoUrl } from "@/lib/photos";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ReceiptPrintTrigger } from "@/components/pass/receipt-print-trigger";

export const dynamic = "force-dynamic";

export default async function PassReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;

  const [pass] = await db
    .select()
    .from(passes)
    .where(eq(passes.id, id))
    .limit(1);

  if (!pass || pass.userId !== session.user.id) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-6">
        <h1 className="text-xl font-semibold">Receipt not found</h1>
        <p className="text-sm text-muted-foreground">
          This pass is missing or belongs to another account.
        </p>
        <Link
          href="/trips"
          className={cn(buttonVariants(), "inline-flex min-h-11")}
        >
          My passes
        </Link>
      </div>
    );
  }

  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.passId, pass.id))
    .limit(1);

  if (payment?.status !== "PAID") {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-6">
        <h1 className="text-xl font-semibold">Receipt unavailable</h1>
        <p className="text-sm text-muted-foreground">
          A printable receipt is available after successful payment.
        </p>
        <Link
          href={`/pass/${pass.id}`}
          className={cn(buttonVariants(), "inline-flex min-h-11")}
        >
          Back to pass
        </Link>
      </div>
    );
  }

  const [jetty] = await db
    .select()
    .from(jetties)
    .where(eq(jetties.id, pass.jettyId))
    .limit(1);
  const [pillar] = await db
    .select()
    .from(locations)
    .where(eq(locations.id, pass.pillarId))
    .limit(1);
  const [angler] = await db
    .select()
    .from(users)
    .where(eq(users.id, pass.userId))
    .limit(1);

  const map = await getSettingsMap();
  const orgName = map.receipt_org_name?.trim() || "TiangPass";
  const tagline =
    map.receipt_tagline?.trim() ||
    "Penang Bridge fishing association pass";
  const address = map.receipt_address?.trim() || "";
  const regNo = map.receipt_reg_no?.trim() || "";
  const phone =
    map.receipt_phone?.trim() || map.support_phone?.trim() || "";
  const email = map.receipt_email?.trim() || "";
  const footer =
    map.receipt_footer?.trim() ||
    "Association fee · non-refundable. Show boarding QR at the jetty for check-in / check-out.";
  const logoSrc = map.receipt_logo_key
    ? photoUrl(map.receipt_logo_key)
    : "/brand/tiangpass-logo.png";

  const qr = await getActiveQrToken(pass.id);
  const showQr =
    !!qr &&
    (pass.status === "ACTIVE" || pass.status === "CHECKED_IN");

  const paymentRef = [
    formatEnumLabel(payment.status),
    payment.provider && payment.provider !== "mock"
      ? formatEnumLabel(payment.provider)
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const printedAt = new Date().toLocaleString("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
  });

  return (
    <div className="mx-auto w-full max-w-[210mm] space-y-4 bg-white px-2 py-4 text-slate-900 sm:px-4">
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          html, body { background: white !important; }
          .no-print { display: none !important; }
          .receipt-sheet {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            max-width: none !important;
          }
        }
      `}</style>

      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/pass/${pass.id}`}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "-ml-2 inline-flex",
          )}
        >
          ← Back to pass
        </Link>
        <Suspense fallback={null}>
          <ReceiptPrintTrigger />
        </Suspense>
      </div>

      <article className="receipt-sheet rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoSrc ?? "/brand/tiangpass-logo.png"}
              alt=""
              className="h-16 w-16 shrink-0 object-contain sm:h-20 sm:w-20"
            />
            <div>
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                {orgName}
              </h1>
              <p className="mt-0.5 text-sm text-slate-600">{tagline}</p>
              {address ? (
                <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-slate-600">
                  {address}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-600">
                {regNo ? <span>Reg: {regNo}</span> : null}
                {phone ? <span>Tel: {phone}</span> : null}
                {email ? <span>{email}</span> : null}
              </div>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Fishing pass receipt
            </p>
            <p className="mt-1 font-mono text-sm font-semibold">
              {pass.reference}
            </p>
            <p className="mt-1 text-xs text-slate-500">Printed {printedAt}</p>
          </div>
        </header>

        <section className="mt-6 grid gap-6 sm:grid-cols-[1fr_auto] sm:items-start">
          <dl className="grid gap-0 text-sm">
            <ReceiptRow label="Angler" value={angler?.name ?? session.user.name ?? "—"} />
            <ReceiptRow label="Valid on" value={pass.validOn} />
            <ReceiptRow label="Jetty" value={jetty?.name ?? "—"} />
            <ReceiptRow label="Pillar" value={pillar?.name ?? "—"} />
            <ReceiptRow label="Fee" value={formatMYR(pass.feeCents)} />
            <ReceiptRow label="Payment" value={paymentRef} />
            <ReceiptRow label="Status" value={formatEnumLabel(pass.status)} />
          </dl>

          <div className="flex flex-col items-center gap-2 sm:min-w-[180px]">
            {showQr && qr ? (
              <>
                <div className="rounded border border-slate-200 bg-white p-2">
                  <QRCodeSVG value={qr.token} size={160} level="M" />
                </div>
                <p className="max-w-[180px] text-center text-[11px] leading-snug text-slate-600">
                  Boarding QR — show at jetty for check-in / check-out
                </p>
                <code className="max-w-[180px] break-all text-center text-[9px] text-slate-400">
                  {qr.token}
                </code>
              </>
            ) : (
              <p className="max-w-[200px] rounded border border-dashed border-slate-300 p-3 text-center text-xs text-slate-500">
                Boarding QR unavailable for this pass status. Open the pass
                screen when Active or Checked-In.
              </p>
            )}
          </div>
        </section>

        {footer ? (
          <footer className="mt-8 border-t border-slate-200 pt-4 text-xs leading-relaxed text-slate-600">
            {footer}
          </footer>
        ) : null}
      </article>
    </div>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-3 border-b border-slate-100 py-2.5 last:border-0 sm:grid-cols-[9rem_1fr]">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
