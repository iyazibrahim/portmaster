import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MarketingBackground } from "@/components/layout/marketing-background";
import { FishingScene } from "@/components/layout/fishing-scene";
import { BrandLogo } from "@/components/brand-logo";
import { getTranslator } from "@/i18n";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";

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
    <main className="relative flex min-h-dvh flex-col overflow-hidden">
      <MarketingBackground />

      <header className="relative z-10 flex min-h-14 items-center justify-between px-4 pt-[env(safe-area-inset-top)] sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <BrandLogo size={36} className="h-9 w-9" priority />
          <span className="text-sm font-semibold tracking-tight text-foreground">
            TiangPass
          </span>
        </Link>
        <nav className="flex items-center gap-2 text-sm sm:gap-4">
          <LocaleSwitcher locale={locale} />
          <Link
            href="/policy"
            className="inline-flex min-h-11 items-center text-muted-foreground hover:text-foreground"
          >
            {t("home.policy")}
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center font-medium text-foreground hover:text-primary"
          >
            {t("common.signIn")}
          </Link>
        </nav>
      </header>

      <div className="relative z-10 flex flex-1 flex-col justify-center px-4 py-10 sm:px-6 lg:px-10 lg:py-12">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <div className="mx-auto flex w-full max-w-lg flex-col gap-8 text-center animate-[fadeUp_0.7s_ease-out_both] lg:mx-0 lg:max-w-none lg:text-left">
            <div className="flex items-center justify-center gap-4 lg:justify-start">
              <BrandLogo
                size={96}
                className="h-20 w-20 sm:h-24 sm:w-24"
                priority
              />
              <p className="font-display text-5xl font-semibold tracking-[-0.03em] text-[oklch(0.22_0.045_255)] sm:text-6xl lg:text-7xl">
                TiangPass
              </p>
            </div>
            <h1 className="mx-auto max-w-xl text-xl font-medium leading-normal tracking-tight text-foreground/75 animate-[fadeUp_0.7s_ease-out_0.12s_both] lg:mx-0 lg:text-3xl">
              {t("home.headline")}
            </h1>
            <div className="mx-auto flex w-full max-w-sm flex-col gap-4 sm:max-w-none sm:flex-row sm:justify-center animate-[fadeUp_0.7s_ease-out_0.22s_both] lg:mx-0 lg:justify-start">
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

          <div className="relative hidden animate-[fadeUp_0.85s_ease-out_0.15s_both] lg:block">
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
