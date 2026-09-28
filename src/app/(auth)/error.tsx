"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ux/error-state";
import { classifyError, uxErrorKeys } from "@/lib/ux/map-error";
import { useT } from "@/i18n/locale-provider";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useT();
  const kind = classifyError(error);
  const keys = uxErrorKeys(kind);

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <ErrorState
          title={t(keys.title)}
          description={t(keys.body)}
          actionHint={t(keys.hint)}
          retryLabel={t("common.retry")}
          onRetry={reset}
          alternativeLabel={t("common.signIn")}
          alternativeHref="/login"
          offline={kind === "network"}
        />
      </div>
    </main>
  );
}
