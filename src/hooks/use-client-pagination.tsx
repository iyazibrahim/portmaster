"use client";

import { useMemo, useState } from "react";

const DEFAULT_PAGE_SIZE = 10;

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
  if (total === 0) return null;
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Page {page + 1} of {pageCount} · {total} row{total === 1 ? "" : "s"}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-sm disabled:opacity-50"
          disabled={!canPrev}
          onClick={onPrev}
        >
          Previous
        </button>
        <button
          type="button"
          className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-sm disabled:opacity-50"
          disabled={!canNext}
          onClick={onNext}
        >
          Next
        </button>
      </div>
    </div>
  );
}
