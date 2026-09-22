"use client";

import { useMemo, useState } from "react";
import { useT } from "@/i18n/locale-provider";

const DEFAULT_PAGE_SIZE = 15;

export function useClientPagination<T>(
  items: T[],
  pageSize: number = DEFAULT_PAGE_SIZE,
) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageItems = useMemo(
    () => items.slice(safePage * pageSize, safePage * pageSize + pageSize),
    [items, safePage, pageSize],
  );

  function resetPage() {
    setPage(0);
  }

  function goPrev() {
    setPage((p) => Math.max(0, p - 1));
  }

  function goNext() {
    setPage((p) => Math.min(pageCount - 1, p + 1));
  }

  return {
    page: safePage,
    pageCount,
    pageItems,
    pageSize,
    total: items.length,
    setPage,
    resetPage,
    goPrev,
    goNext,
    canPrev: safePage > 0,
    canNext: safePage < pageCount - 1,
  };
}

export function PaginationBar({
  page,
  pageCount,
  total,
  canPrev,
  canNext,
  onPrev,
  onNext,
}: {
  page: number;
  pageCount: number;
  total: number;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  const { t } = useT();
  if (total === 0) return null;
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {t("common.pageOf", {
          page: page + 1,
          pages: pageCount,
          total,
        })}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm disabled:opacity-50"
          disabled={!canPrev}
          onClick={onPrev}
        >
          {t("common.previous")}
        </button>
        <button
          type="button"
          className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm disabled:opacity-50"
          disabled={!canNext}
          onClick={onNext}
        >
          {t("common.next")}
        </button>
      </div>
    </div>
  );
}
