import Link from "next/link";
import { cn } from "@/lib/utils";

export type AdminTab = {
  href: string;
  label: string;
  active: boolean;
};

export function AdminPageTabs({ tabs }: { tabs: AdminTab[] }) {
  return (
    <div
      className="inline-flex w-fit max-w-full flex-wrap items-center gap-1 rounded-lg border border-border/70 p-1 text-sm"
      role="tablist"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          role="tab"
          aria-selected={tab.active}
          className={cn(
            "pressable inline-flex min-h-11 items-center rounded-md px-4 font-medium transition-colors",
            tab.active
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
