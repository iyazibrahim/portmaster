import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ConsentPage() {
  return (
    <main className="min-h-dvh">
      <header className="flex h-14 items-center border-b border-border px-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          PortMaster
        </Link>
      </header>
      <article className="mx-auto max-w-2xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Consent</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Boarding QR and operational data
          </p>
        </div>
        <section className="space-y-3 text-sm leading-relaxed text-foreground/90">
          <p>
            By creating an account and booking a trip, you consent to PortMaster
            issuing an opaque boarding QR token for your booking, and to
            handlers scanning that token for check-in and check-out.
          </p>
          <p>
            Check-in records your assigned location and time for live ops. This
            demo does not use live GPS. Emergency contact is used only if
            operators need to reach someone on your behalf.
          </p>
          <p>
            You may request account deletion from support. Historical scan and
            payment records may be retained for ops audit as required by the
            jetty operator.
          </p>
        </section>
        <div className="flex flex-wrap gap-3">
          <Link href="/policy" className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}>
            Policy
          </Link>
          <Link href="/signup" className={cn(buttonVariants(), "min-h-11")}>
            Back to sign up
          </Link>
        </div>
      </article>
    </main>
  );
}
