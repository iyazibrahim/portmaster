import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ConsentPage() {
  return (
    <main className="min-h-dvh">
      <header className="flex h-14 items-center justify-between border-b border-border px-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          TiangPass
        </Link>
        <nav className="flex gap-3 text-xs text-muted-foreground">
          <Link href="/policy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link href="/cookies" className="hover:text-foreground">
            Cookies
          </Link>
          <Link href="/consent" className="hover:text-foreground">
            Consent
          </Link>
        </nav>
      </header>
      <article className="mx-auto max-w-2xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Consent notice
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Last updated 21 Sep 2026 · PDPA &amp; boarding operations
          </p>
        </div>
        <section className="space-y-4 text-sm leading-relaxed text-foreground/90">
          <p>
            By creating a TiangPass account or buying a fishing pass, you give
            informed consent for the Association to process your personal data
            as described in the{" "}
            <Link
              href="/policy"
              className="text-primary underline-offset-4 hover:underline"
            >
              Privacy Policy
            </Link>
            .
          </p>

          <h2 className="text-base font-semibold tracking-tight">
            What you consent to
          </h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="font-medium">Identity verification:</span>{" "}
              processing your name, MyKad-derived details, and a live identity
              photo so operators can visually match the person boarding to the
              pass.
            </li>
            <li>
              <span className="font-medium">Location for purchase &amp;
              boarding:</span>{" "}
              capturing your device location to confirm you are within the
              jetty’s purchase radius (default 100 metres, configurable by
              Admin) and during operator scan events.
            </li>
            <li>
              <span className="font-medium">Pass &amp; QR:</span> issuing an
              opaque boarding QR for your pass and allowing authorised operators
              to scan it for check-in and check-out.
            </li>
            <li>
              <span className="font-medium">Emergency contact:</span> contacting
              the number you provide if operators need to reach someone on your
              behalf.
            </li>
            <li>
              <span className="font-medium">Audit:</span> recording who performed
              operational actions (for example payment, check-in) for support and
              compliance.
            </li>
          </ul>

          <h2 className="text-base font-semibold tracking-tight">
            Withdrawing consent
          </h2>
          <p>
            You may withdraw consent by contacting Association Admin or closing
            your account. Withdrawal does not affect processing already
            completed. Without identity photo and location consent we cannot
            issue or board Association passes.
          </p>

          <h2 className="text-base font-semibold tracking-tight">
            Children
          </h2>
          <p>
            Angler accounts are for Malaysian citizens aged 14 and above.
            Guardians should supervise younger teens using the service.
          </p>
        </section>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/policy"
            className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}
          >
            Privacy Policy
          </Link>
          <Link
            href="/cookies"
            className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}
          >
            Cookies Policy
          </Link>
          <Link href="/signup" className={cn(buttonVariants(), "min-h-11")}>
            Back to sign up
          </Link>
        </div>
      </article>
    </main>
  );
}
