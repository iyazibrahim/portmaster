import Link from "next/link";
import { Newsreader } from "next/font/google";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MarketingBackground } from "@/components/layout/marketing-background";
import { FishingScene } from "@/components/layout/fishing-scene";

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
      <MarketingBackground />

      <header className="relative z-10 flex h-14 items-center justify-between px-4 sm:px-6 lg:px-10">
        <span className="text-sm font-semibold tracking-tight text-foreground">
          PortMaster
        </span>
        <nav className="flex items-center gap-5 text-sm">
          <Link
            href="/policy"
            className="text-muted-foreground hover:text-foreground"
          >
            Policy
          </Link>
          <Link
            href="/login"
            className="font-medium text-foreground hover:text-primary"
          >
            Sign in
          </Link>
        </nav>
      </header>

      <div className="relative z-10 flex flex-1 flex-col justify-center px-4 py-10 sm:px-6 lg:px-10 lg:py-12">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14">
          <div className="space-y-7 animate-[fadeUp_0.7s_ease-out_both]">
            <p
              className="font-[family-name:var(--font-display-landing)] text-5xl font-semibold tracking-tight text-[oklch(0.22_0.045_255)] sm:text-6xl lg:text-7xl"
            >
              PortMaster
            </p>
            <div className="space-y-3 animate-[fadeUp_0.7s_ease-out_0.12s_both]">
              <h1 className="max-w-lg text-xl font-medium tracking-tight text-foreground sm:text-2xl">
                Penang jetty fishing, booked before you cast.
              </h1>
              <p className="max-w-md text-base text-muted-foreground sm:text-lg">
                Pick a jetty and fishing spot, seat your party on a boat, and
                board with a digital QR pass.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row animate-[fadeUp_0.7s_ease-out_0.22s_both]">
              <Link
                href="/login?next=/book"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "min-h-11 w-full sm:w-auto sm:min-w-44",
                )}
              >
                Book a trip
              </Link>
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "min-h-11 w-full sm:w-auto sm:min-w-44",
                )}
              >
                Sign in
              </Link>
            </div>
            <p className="text-sm text-muted-foreground animate-[fadeUp_0.7s_ease-out_0.3s_both]">
              New angler?{" "}
              <Link
                href="/signup"
                className="text-primary underline-offset-4 hover:underline"
              >
                Create an account
              </Link>
            </p>
          </div>

          <div className="relative animate-[fadeUp_0.85s_ease-out_0.15s_both]">
            <FishingScene className="mx-auto max-w-xl lg:max-w-none" />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}
