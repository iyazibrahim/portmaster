"use client";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PaginationBar,
  useClientPagination,
} from "@/hooks/use-client-pagination";
import { useT } from "@/i18n/locale-provider";

export const ADMIN_PAGE_SIZE = 15;
export const ADMIN_CONTROL =
  "min-h-11 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm";

type AdminDataTableProps<T> = {
  items: T[];
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  /** Rows per page (default 15). Alerts & incidents use 5. */
  pageSize?: number;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  emptyMessage?: string;
  children: (pageItems: T[]) => React.ReactNode;
  className?: string;
};

/**
 * Shared admin list shell: min-h-11 toolbar, 15/page, compact table slot.
 * Horizontal scroll lives on nested Table — avoid a second scroll wrapper.
 */
export function AdminDataTable<T>({
  items,
  search,
  onSearchChange,
  searchPlaceholder,
  pageSize = ADMIN_PAGE_SIZE,
  filters,
  actions,
  emptyMessage,
  children,
  className,
}: AdminDataTableProps<T>) {
  const { t } = useT();
  const pager = useClientPagination(items, pageSize);
  const placeholder = searchPlaceholder ?? `${t("common.search")}…`;
  const empty = emptyMessage ?? t("common.noRows");

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:min-w-[12rem] sm:max-w-xs">
            <Label>{t("admin.search")}</Label>
            <Input
              className={ADMIN_CONTROL}
              placeholder={placeholder}
              value={search}
              onChange={(e) => {
                onSearchChange(e.target.value);
                pager.resetPage();
              }}
            />
          </div>
          {filters}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-end gap-2">{actions}</div>
        ) : null}
      </div>

      <div className="rounded-lg ring-1 ring-foreground/10">
        {items.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            {empty}
          </p>
        ) : (
          children(pager.pageItems)
        )}
      </div>

      <PaginationBar
        page={pager.page}
        pageCount={pager.pageCount}
        total={pager.total}
        canPrev={pager.canPrev}
        canNext={pager.canNext}
        onPrev={pager.goPrev}
        onNext={pager.goNext}
      />
    </div>
  );
}
