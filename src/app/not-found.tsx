import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { getTranslator } from "@/i18n";

export default async function NotFound() {
  const { t } = await getTranslator();

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 py-8 text-center">
      <BrandLogo size={64} className="h-16 w-16" />
      <div className="flex max-w-sm flex-col gap-2">
        <h1 className="text-xl font-semibold tracking-tight">
          {t("ux.notFound.title")}
        </h1>
        <p className="text-sm leading-normal text-muted-foreground">
          {t("ux.notFound.body")}
        </p>
      </div>
      <Button render={<Link href="/" />}>{t("common.goHome")}</Button>
    </main>
  );
}
