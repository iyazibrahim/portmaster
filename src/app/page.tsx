import Link from "next/link";
import { Newsreader } from "next/font/google";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MarketingBackground } from "@/components/layout/marketing-background";
import { FishingScene } from "@/components/layout/fishing-scene";
import { BrandLogo } from "@/components/brand-logo";
import { getTranslator } from "@/i18n";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";

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
    if (session.user.role === "LLM_VIEWER") redirect("/llm");
    if (session.user.role === "HANDLER") redirect("/handler");
    redirect("/pass");
  }

  const { t, locale } = await getTranslator();

  return (
    <main
      className={cn(
        newsreader.variable,
        "relative flex min-h-dvh flex-col overflow-hidden",
      )}
    >
      <MarketingBackground />

      <header className="relative z-10 flex h-14 items-center justify-between px-4 sm:px-6 lg:px-10">
        <Link href="/" className="flex items-center gap-2">
          <BrandLogo size={36} className="h-9 w-9" priority />
          <span className="text-sm font-semibold tracking-tight text-foreground">
            TiangPass
          </span>
        </Link>
        <nav className="flex items-center gap-3 text-sm sm:gap-5">
          <LocaleSwitcher locale={locale} />
          <Link
            href="/policy"
            className="text-muted-foreground hover:text-foreground"
          >
            {t("home.policy")}
          </Link>
          <Link
            href="/login"
            className="font-medium text-foreground hover:text-primary"
          >
            {t("common.signIn")}
          </Link>
        </nav>
      </header>

      <div className="relative z-10 flex flex-1 flex-col justify-center px-4 py-10 sm:px-6 lg:px-10 lg:py-12">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14">
          <div className="space-y-7 animate-[fadeUp_0.7s_ease-out_both]">
            <div className="flex items-center gap-4">
              <BrandLogo
                size={96}
                className="h-20 w-20 sm:h-24 sm:w-24"
                priority
              />
              <p className="font-[family-name:var(--font-display-landing)] text-5xl font-semibold tracking-tight text-[oklch(0.22_0.045_255)] sm:text-6xl lg:text-7xl">
                TiangPass
              </p>
            </div>
            <div className="space-y-3 animate-[fadeUp_0.7s_ease-out_0.12s_both]">
              <h1 className="max-w-lg text-xl font-medium tracking-tight text-foreground sm:text-2xl">
                {t("home.headline")}
              </h1>
              <p className="max-w-md text-base text-muted-foreground sm:text-lg">
                {t("home.sub")}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row animate-[fadeUp_0.7s_ease-out_0.22s_both]">
              <Link
                href="/login?next=/pass"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "min-h-11 w-full sm:w-auto sm:min-w-44",
                )}
              >
                {t("home.ctaBuy")}
              </Link>
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "min-h-11 w-full sm:w-auto sm:min-w-44",
                )}
              >
                {t("home.ctaSignIn")}
              </Link>
            </div>
            <p className="text-sm text-muted-foreground animate-[fadeUp_0.7s_ease-out_0.3s_both]">
              {t("auth.noAccount")}{" "}
              <Link
                href="/signup"
                className="text-primary underline-offset-4 hover:underline"
              >
                {t("auth.signupLink")}
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
