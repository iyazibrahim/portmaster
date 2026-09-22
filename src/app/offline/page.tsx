import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { getTranslator } from "@/i18n";

export default async function OfflinePage() {
  const { t } = await getTranslator();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <BrandLogo size={72} className="mb-4 h-16 w-16" />
      <h1 className="text-2xl font-semibold tracking-tight">{t("offline.title")}</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {t("offline.body")}
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link
          href="/handler/scan"
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          {t("offline.scanner")}
        </Link>
        <Link
          href="/trips"
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          {t("offline.myPasses")}
        </Link>
        <Link
          href="/"
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          {t("offline.home")}
        </Link>
      </div>
    </main>
  );
}
