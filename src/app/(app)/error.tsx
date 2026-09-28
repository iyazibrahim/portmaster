"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ux/error-state";
import { classifyError, uxErrorKeys } from "@/lib/ux/map-error";
import { useT } from "@/i18n/locale-provider";

export default function AppError({
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
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 py-8">
      <ErrorState
        title={t(keys.title)}
        description={t(keys.body)}
        actionHint={t(keys.hint)}
        retryLabel={t("common.retry")}
        onRetry={reset}
        alternativeLabel={t("common.goHome")}
        alternativeHref="/"
        offline={kind === "network"}
      />
    </div>
  );
}
