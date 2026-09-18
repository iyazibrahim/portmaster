import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function PolicyPage() {
  return (
    <main className="min-h-dvh">
      <header className="flex h-14 items-center border-b border-border px-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          PortMaster
        </Link>
      </header>
      <article className="mx-auto max-w-2xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            PortMaster Policy
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Last updated 18 Sep 2026
          </p>
        </div>
        <section className="space-y-3 text-sm leading-relaxed text-foreground/90">
          <p>
            PortMaster helps anglers book numbered bridge locations, reserve
            boat seats, and board with a QR pass. Handlers and admins use the
            same platform for schedule, scan, and ops.
          </p>
          <h2 className="text-base font-semibold tracking-tight">Safety</h2>
          <p>
            You are responsible for your own safety on the water. Provide an
            accurate emergency contact. Follow handler instructions at the
            jetty and on board.
          </p>
          <h2 className="text-base font-semibold tracking-tight">Bookings</h2>
          <p>
            Seats are held when you create a booking and confirmed after mock
            payment in this demo. Cancellations and refunds follow jetty
            operator rules when live payments are enabled.
          </p>
          <h2 className="text-base font-semibold tracking-tight">Data</h2>
          <p>
            We store account details, emergency contact, bookings, and scan
            events needed to run the service. See Consent for how boarding
            tokens and check-in data are used.
          </p>
        </section>
        <Link
          href="/consent"
          className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}
        >
          Read consent
        </Link>
      </article>
    </main>
  );
}
