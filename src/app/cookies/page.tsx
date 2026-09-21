import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function CookiesPage() {
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
            Cookies Policy
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Last updated 21 Sep 2026
          </p>
        </div>
        <section className="space-y-4 text-sm leading-relaxed text-foreground/90">
          <p>
            Cookies and similar storage help TiangPass keep you signed in,
            remember language, and (if you choose) understand how the app is
            used. This notice should be read with our{" "}
            <Link
              href="/policy"
              className="text-primary underline-offset-4 hover:underline"
            >
              Privacy Policy
            </Link>
            .
          </p>

          <h2 className="text-base font-semibold tracking-tight">
            Categories
          </h2>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 font-medium">Purpose</th>
                  <th className="px-3 py-2 font-medium">Required</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="px-3 py-2 align-top font-medium">
                    Necessary
                  </td>
                  <td className="px-3 py-2 align-top">
                    Session / login cookie, CSRF and security, language
                    preference (`tiangpass_locale`), cookie consent choice
                    (`tiangpass_cookie_consent`).
                  </td>
                  <td className="px-3 py-2 align-top">Yes</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 align-top font-medium">
                    Analytics (optional)
                  </td>
                  <td className="px-3 py-2 align-top">
                    Aggregate usage to improve reliability and UX. Only set if
                    you choose “Accept all” on the consent banner. Not used for
                    advertising in this demo.
                  </td>
                  <td className="px-3 py-2 align-top">No</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-base font-semibold tracking-tight">
            Managing cookies
          </h2>
          <p>
            On first visit you can choose <strong>Necessary only</strong> or{" "}
            <strong>Accept all</strong>. Clear site cookies in your browser to
            see the banner again. Blocking necessary cookies may prevent sign-in
            or language switching.
          </p>

          <h2 className="text-base font-semibold tracking-tight">
            Local storage
          </h2>
          <p>
            We may store a dismiss flag for the “Install TiangPass” prompt on
            mobile so we do not nag you after you choose Not now.
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
            href="/consent"
            className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}
          >
            Consent notice
          </Link>
        </div>
      </article>
    </main>
  );
}
