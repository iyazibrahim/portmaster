import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function LegalShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
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
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {children}
      </article>
    </main>
  );
}

export default function PolicyPage() {
  return (
    <LegalShell
      title="Privacy Policy (PDPA)"
      subtitle="Last updated 21 Sep 2026 · Personal Data Protection Act 2010 (Malaysia)"
    >
      <section className="space-y-4 text-sm leading-relaxed text-foreground/90">
        <p>
          TiangPass (“we”, “us”) operates a same-day Association fishing pass
          platform for Penang Bridge anglers, boat operators, and Association
          Admin. This notice explains how we collect, use, disclose, and protect
          personal data in line with the Malaysian Personal Data Protection Act
          2010 (PDPA) and related regulations.
        </p>

        <h2 className="text-base font-semibold tracking-tight">
          1. Data controller
        </h2>
        <p>
          The Association Admin operating TiangPass for Jambatan Pulau Pinang
          fishing passes is the data user. Contact:{" "}
          <span className="font-medium">privacy@tiangpass.local</span> (demo
          address — replace with your live operator email before production).
        </p>

        <h2 className="text-base font-semibold tracking-tight">
          2. Personal data we collect
        </h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Identity &amp; contact: name, email, mobile, emergency contact,
            address, MyKad (hashed; last 4 digits retained), date of birth,
            citizenship.
          </li>
          <li>
            Identity photo: live camera capture for operator visual verification
            at check-in (e-KYC style; file upload is not accepted).
          </li>
          <li>
            Location: approximate GPS when you buy a pass or when operators scan
            boarding, to confirm you are within the jetty purchase radius.
          </li>
          <li>
            Pass &amp; ops data: jetty/pillar selection, payment status, QR
            tokens, check-in / check-out times, audit trail of who did what.
          </li>
          <li>
            Technical: session cookies, language preference, optional analytics
            if you accept them (see Cookies Policy).
          </li>
        </ul>

        <h2 className="text-base font-semibold tracking-tight">
          3. Purpose of processing
        </h2>
        <p>We process personal data to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Create and manage your account and Association fishing passes.</li>
          <li>
            Verify you are at an authorised jetty before purchase (geofence).
          </li>
          <li>
            Enable boat operators to match the person boarding with the pass
            photo and QR.
          </li>
          <li>
            Run safety, capacity, and incident operations for the Association.
          </li>
          <li>
            Keep an audit trail for support, dispute handling, and compliance.
          </li>
          <li>Improve the service (only with optional analytics consent).</li>
        </ul>

        <h2 className="text-base font-semibold tracking-tight">
          4. Legal basis / consent
        </h2>
        <p>
          Registration requires your consent to this Privacy Policy, the Consent
          notice, and location use for jetty verification. You may withdraw
          consent where processing is consent-based, but we may be unable to
          provide passes or boarding without identity and location checks
          required for safety and Association rules.
        </p>

        <h2 className="text-base font-semibold tracking-tight">
          5. Disclosure
        </h2>
        <p>
          Data may be shared with authorised boat operators and Association
          Admin for boarding and ops; with payment providers when live payments
          are enabled; and with authorities where required by law. We do not
          sell personal data.
        </p>

        <h2 className="text-base font-semibold tracking-tight">6. Retention</h2>
        <p>
          Account and pass records are kept while your account is active and for
          a reasonable period afterward for audit, safety, and legal claims
          (typically up to seven years for financial/ops records, or as required
          by the Association). Photos and location snapshots used for a day’s
          pass are retained as part of that pass record.
        </p>

        <h2 className="text-base font-semibold tracking-tight">
          7. Your PDPA rights
        </h2>
        <p>
          Subject to PDPA exceptions, you may request access to or correction of
          your personal data, limit processing, and withdraw consent. Contact
          the email above. We may need to verify your identity before acting on
          a request.
        </p>

        <h2 className="text-base font-semibold tracking-tight">8. Security</h2>
        <p>
          Passwords are stored hashed. Photos and sessions are access-controlled.
          No method of transmission or storage is fully secure; report suspected
          misuse promptly.
        </p>

        <h2 className="text-base font-semibold tracking-tight">
          9. Safety on the water
        </h2>
        <p>
          You remain responsible for your own safety. Provide an accurate
          emergency contact and follow operator instructions at the jetty and on
          board.
        </p>
      </section>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/consent"
          className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}
        >
          Consent notice
        </Link>
        <Link
          href="/cookies"
          className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}
        >
          Cookies Policy
        </Link>
      </div>
    </LegalShell>
  );
}
