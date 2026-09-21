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
        TiangPass shell is available offline, but booking and API actions need
        a network connection.
      </p>
      <Link
        href="/"
        className="mt-6 text-sm text-primary underline-offset-4 hover:underline"
      >
        Try home
      </Link>
    </main>
  );
}
