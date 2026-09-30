import Link from "next/link";
import type { ReactNode } from "react";

export function LegalShell({
  title,
  subtitle,
  navPrivacy,
  navCookies,
  navConsent,
  navTerms,
  children,
}: {
  title: string;
  subtitle?: string;
  navPrivacy: string;
  navCookies: string;
  navConsent: string;
  navTerms: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-dvh">
      <header className="flex h-14 items-center justify-between gap-3 border-b border-border px-4 sm:px-6 lg:px-8">
        <Link href="/" className="shrink-0 text-sm font-semibold tracking-tight">
          TiangPass
        </Link>
        <nav className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <Link href="/policy" className="hover:text-foreground">
            {navPrivacy}
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            {navTerms}
          </Link>
          <Link href="/cookies" className="hover:text-foreground">
            {navCookies}
          </Link>
          <Link href="/consent" className="hover:text-foreground">
            {navConsent}
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
