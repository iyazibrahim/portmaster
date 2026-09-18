import Link from "next/link";
import { Newsreader } from "next/font/google";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-display-landing",
  display: "swap",
});

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    if (session.user.role === "ADMIN") redirect("/admin/ops");
    if (session.user.role === "HANDLER") redirect("/handler");
    redirect("/book");
  }

  return (
    <main
      className={cn(
        newsreader.variable,
        "relative flex min-h-dvh flex-col overflow-hidden",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_oklch(0.94_0.03_250)_0%,_transparent_55%),linear-gradient(180deg,_oklch(0.985_0.006_250)_0%,_oklch(0.96_0.02_250)_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 opacity-[0.07]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%230c2340' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      <header className="relative z-10 flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
        <span className="text-sm font-semibold tracking-tight text-foreground">
          PortMaster
        </span>
        <Link
          href="/policy"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Policy
        </Link>
      </header>

      <div className="relative z-10 flex flex-1 flex-col justify-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-lg space-y-8">
          <div className="space-y-4">
            <p
              className="font-[family-name:var(--font-display-landing)] text-5xl font-semibold tracking-tight text-[oklch(0.22_0.045_255)] sm:text-6xl"
            >
              PortMaster
            </p>
            <p className="max-w-md text-base text-muted-foreground sm:text-lg">
              Pick a Penang fishing jetty, choose a location, seat your party, and
              board with a QR pass.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login?next=/book"
              className={cn(
                buttonVariants({ size: "lg" }),
                "min-h-11 w-full sm:w-auto sm:min-w-40",
              )}
            >
              Book a trip
            </Link>
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "min-h-11 w-full sm:w-auto sm:min-w-40",
              )}
            >
              Sign in
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">
            New angler?{" "}
            <Link href="/signup" className="text-primary underline-offset-4 hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
