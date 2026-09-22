"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Anchor,
  AlertTriangle,
  Bell,
  ClipboardList,
  FileBarChart,
  LayoutDashboard,
  MapPinned,
  QrCode,
  Settings,
  Ship,
  Ticket,
  Users,
  Wallet,
  LogOut,
  Menu,
  Eye,
  ScrollText,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { logoutAction } from "@/lib/actions/auth";
import type { UserRole } from "@/db/schema";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { BrandLogo } from "@/components/brand-logo";
import { useT } from "@/i18n/locale-provider";

function isPassReceiptPath(pathname: string) {
  return /\/pass\/[^/]+\/receipt\/?$/.test(pathname);
}

type NavItem = {
  href: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
};

function navForRole(role: UserRole): NavItem[] {
  if (role === "ADMIN") {
    return [
      { href: "/admin/ops", labelKey: "nav.dashboard", icon: LayoutDashboard },
      { href: "/admin/users", labelKey: "nav.people", icon: Users },
      { href: "/admin/passes", labelKey: "nav.passes", icon: Ticket },
      { href: "/admin/boats", labelKey: "nav.boats", icon: Ship },
      { href: "/admin/operators", labelKey: "nav.operators", icon: Anchor },
      { href: "/admin/locations", labelKey: "nav.pillars", icon: MapPinned },
      { href: "/admin/jetties", labelKey: "nav.jetties", icon: Anchor },
      { href: "/admin/payments", labelKey: "nav.payments", icon: Wallet },
      { href: "/admin/alerts", labelKey: "nav.alerts", icon: Bell },
      {
        href: "/admin/sync-conflicts",
        labelKey: "nav.syncConflicts",
        icon: AlertTriangle,
      },
      { href: "/admin/reports", labelKey: "nav.reports", icon: FileBarChart },
      { href: "/admin/settings", labelKey: "nav.settings", icon: Settings },
      { href: "/admin/audit", labelKey: "nav.audit", icon: ScrollText },
      { href: "/profile", labelKey: "common.account", icon: Users },
    ];
  }
  if (role === "LLM_VIEWER") {
    return [
      { href: "/llm", labelKey: "nav.dashboard", icon: LayoutDashboard },
      {
        href: "/llm/operations",
        labelKey: "nav.operations",
        icon: ClipboardList,
      },
      { href: "/llm/pillars", labelKey: "nav.pillarStatus", icon: MapPinned },
      { href: "/llm/boats", labelKey: "nav.boats", icon: Ship },
      { href: "/llm/anglers", labelKey: "nav.anglers", icon: Users },
      { href: "/llm/reports", labelKey: "nav.reports", icon: FileBarChart },
      { href: "/profile", labelKey: "common.account", icon: Users },
    ];
  }
  if (role === "HANDLER") {
    return [
      { href: "/handler/scan", labelKey: "nav.scan", icon: QrCode },
      { href: "/handler", labelKey: "nav.today", icon: LayoutDashboard },
      { href: "/handler/boat", labelKey: "nav.fleet", icon: Ship },
      { href: "/profile", labelKey: "common.account", icon: Users },
    ];
  }
  return [
    { href: "/pass", labelKey: "nav.buyPass", icon: Ticket },
    { href: "/trips", labelKey: "nav.myPasses", icon: ClipboardList },
    { href: "/profile", labelKey: "nav.profile", icon: Users },
  ];
}

function brandKey(role: UserRole) {
  if (role === "LLM_VIEWER") return "nav.brand.llm";
  if (role === "ADMIN") return "nav.brand.admin";
  return "nav.brand.default";
}

function roleLabelKey(role: UserRole) {
  if (role === "LLM_VIEWER") return "common.role.llm";
  if (role === "USER") return "common.role.angler";
  if (role === "HANDLER") return "common.role.operator";
  return "common.role.admin";
}

function NavLinks({
  items,
  pathname,
  onNavigate,
  variant,
  t,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
  variant: "sidebar" | "bottom" | "sheet";
  t: (key: string) => string;
}) {
  return (
    <>
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        const label = t(item.labelKey);
        if (variant === "bottom") {
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 text-center text-[10px] font-medium leading-tight sm:text-[11px]",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className={cn("size-5 shrink-0", active && "text-primary")} />
              <span className="line-clamp-2 max-w-[4.5rem]">{label}</span>
            </Link>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
              variant === "sidebar"
                ? active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                : active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
    </>
  );
}

export function AppNav({
  role,
  name,
  locale = "en",
}: {
  role: UserRole;
  name?: string | null;
  locale?: "en" | "ms";
}) {
  const pathname = usePathname();
  const { t } = useT();
  const items = navForRole(role);
  const isLlm = role === "LLM_VIEWER";

  if (isPassReceiptPath(pathname)) return null;

  return (
    <aside className="hidden h-full min-h-0 shrink-0 overflow-hidden lg:flex lg:w-60 lg:flex-col lg:border-r lg:border-sidebar-border lg:bg-sidebar">
      <div className="flex h-14 shrink-0 items-center gap-2 px-4">
        <BrandLogo size={28} className="h-7 w-7" />
        <span className="truncate text-sm font-semibold tracking-tight text-sidebar-foreground">
          {t(brandKey(role))}
        </span>
      </div>
      <nav className="scrollbar-none flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain px-2 py-1">
        <NavLinks items={items} pathname={pathname} variant="sidebar" t={t} />
      </nav>
      <div className="shrink-0 border-t border-sidebar-border p-3">
        {isLlm ? (
          <p className="mb-2 flex items-center gap-1.5 px-1 text-[11px] text-sidebar-foreground/70">
            <Eye className="size-3.5 shrink-0" />
            {t("common.viewOnly")}
          </p>
        ) : null}
        <div className="mb-2 px-1">
          <LocaleSwitcher locale={locale} />
        </div>
        <p className="mb-2 truncate px-1 text-xs text-sidebar-foreground/70">
          {name}
          <span className="ml-1 text-[10px] uppercase tracking-wide">
            · {t(roleLabelKey(role))}
          </span>
        </p>
        <form action={logoutAction}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="min-h-11 w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="size-4" />
            {t("common.signOut")}
          </Button>
        </form>
      </div>
    </aside>
  );
}

export function MobileBottomNav({
  role,
  locale = "en",
}: {
  role: UserRole;
  locale?: "en" | "ms";
}) {
  const pathname = usePathname();
  const { t } = useT();
  const items = navForRole(role);
  const [open, setOpen] = useState(false);
  const isAdmin = role === "ADMIN" || role === "LLM_VIEWER";
  const isLlm = role === "LLM_VIEWER";

  if (isPassReceiptPath(pathname)) return null;

  return isAdmin ? (
    <div className="flex shrink-0 items-center gap-2 border-t border-border bg-background px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-muted">
          <Menu className="size-4" />
          {t("common.menu")}
        </SheetTrigger>
        <SheetContent side="left" className="w-72">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <BrandLogo size={28} className="h-7 w-7" />
              {t(brandKey(role))}
            </SheetTitle>
          </SheetHeader>
          <nav className="scrollbar-none mt-4 flex max-h-[70vh] flex-col gap-1 overflow-y-auto">
            <NavLinks
              items={items}
              pathname={pathname}
              variant="sheet"
              onNavigate={() => setOpen(false)}
              t={t}
            />
          </nav>
          <div className="mt-4 px-1">
            <LocaleSwitcher locale={locale} />
          </div>
          {isLlm ? (
            <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertTriangle className="size-3.5" />
              {t("common.noAdmin")}
            </p>
          ) : null}
          <form action={logoutAction} className="mt-6">
            <Button
              type="submit"
              variant="outline"
              className="min-h-11 w-full justify-start gap-2"
            >
              <LogOut className="size-4" />
              {t("common.signOut")}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
      <div className="scrollbar-none flex min-w-0 flex-1 gap-1 overflow-x-auto">
        {items.slice(0, 4).map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-11 shrink-0 items-center gap-1.5 rounded-md px-3 text-xs font-medium",
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <Icon className="size-3.5 shrink-0" />
              <span className="max-w-[6rem] truncate">{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </div>
  ) : (
    <nav className="flex shrink-0 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] lg:hidden">
      <NavLinks items={items} pathname={pathname} variant="bottom" t={t} />
    </nav>
  );
}

export function MobileTopBar({
  title,
  locale = "en",
}: {
  title?: string;
  locale?: "en" | "ms";
}) {
  const pathname = usePathname();
  const { t } = useT();
  if (isPassReceiptPath(pathname)) return null;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6 lg:hidden">
      <span className="flex min-w-0 items-center gap-2 text-sm font-semibold tracking-tight">
        <BrandLogo size={28} className="h-7 w-7 shrink-0" />
        <span className="truncate">{title ?? t("nav.brand.default")}</span>
      </span>
      <LocaleSwitcher locale={locale} />
    </header>
  );
}
