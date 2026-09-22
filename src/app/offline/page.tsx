import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <BrandLogo size={72} className="mb-4 h-16 w-16" />
      <h1 className="text-2xl font-semibold tracking-tight">
        You&apos;re offline
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        TiangPass shell works offline. Operators can board from a downloaded
        offline pack; anglers can show a cached pass QR. Purchase and Admin
        still need a network connection.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link
          href="/handler/scan"
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          Operator scanner
        </Link>
        <Link
          href="/trips"
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          My passes
        </Link>
        <Link
          href="/"
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          Try home
        </Link>
      </div>
    </main>
  );
}
