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

function isPassReceiptPath(pathname: string) {
  return /\/pass\/[^/]+\/receipt\/?$/.test(pathname);
}

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

function navForRole(role: UserRole): NavItem[] {
  if (role === "ADMIN") {
    return [
      { href: "/admin/ops", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/users", label: "People", icon: Users },
      { href: "/admin/passes", label: "Fishing Passes", icon: Ticket },
      { href: "/admin/boats", label: "Boats", icon: Ship },
      { href: "/admin/operators", label: "Boat Operators", icon: Anchor },
      { href: "/admin/locations", label: "Pillars", icon: MapPinned },
      { href: "/admin/jetties", label: "Jetties", icon: Anchor },
      { href: "/admin/payments", label: "Payments", icon: Wallet },
      { href: "/admin/alerts", label: "Alerts & Incidents", icon: Bell },
      { href: "/admin/reports", label: "Reports", icon: FileBarChart },
      { href: "/admin/settings", label: "System Settings", icon: Settings },
      { href: "/admin/audit", label: "Audit Trail", icon: ScrollText },
      { href: "/profile", label: "Account", icon: Users },
    ];
  }
  if (role === "LLM_VIEWER") {
    return [
      { href: "/llm", label: "Dashboard", icon: LayoutDashboard },
      { href: "/llm/operations", label: "Operations Overview", icon: ClipboardList },
      { href: "/llm/pillars", label: "Pillar Status", icon: MapPinned },
      { href: "/llm/boats", label: "Boats", icon: Ship },
      { href: "/llm/anglers", label: "Anglers", icon: Users },
      { href: "/llm/reports", label: "Reports", icon: FileBarChart },
      { href: "/profile", label: "Account", icon: Users },
    ];
  }
  if (role === "HANDLER") {
    return [
      { href: "/handler/scan", label: "Scan", icon: QrCode },
      { href: "/handler", label: "Today", icon: LayoutDashboard },
      { href: "/handler/boat", label: "Fleet", icon: Ship },
      { href: "/profile", label: "Account", icon: Users },
    ];
  }
  return [
    { href: "/pass", label: "Buy Pass", icon: Ticket },
    { href: "/trips", label: "My Passes", icon: ClipboardList },
    { href: "/profile", label: "Profile", icon: Users },
  ];
}

function brandTitle(role: UserRole) {
  if (role === "LLM_VIEWER") return "Bridge Fishing Monitoring";
  if (role === "ADMIN") return "Bridge Fishing Pass";
  return "TiangPass";
}

function NavLinks({
  items,
  pathname,
  onNavigate,
  variant,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
  variant: "sidebar" | "bottom" | "sheet";
}) {
  return (
    <>
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        if (variant === "bottom") {
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className={cn("size-5", active && "text-primary")} />
              {item.label}
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
            {item.label}
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
  const items = navForRole(role);
  const isLlm = role === "LLM_VIEWER";

  if (isPassReceiptPath(pathname)) return null;

  return (
      <aside className="hidden h-full min-h-0 shrink-0 overflow-hidden lg:flex lg:w-60 lg:flex-col lg:border-r lg:border-sidebar-border lg:bg-sidebar">
        <div className="flex h-14 shrink-0 items-center gap-2 px-4">
          <BrandLogo size={28} className="h-7 w-7" />
          <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
            {brandTitle(role)}
          </span>
        </div>
        <nav className="scrollbar-none flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain px-2 py-1">
          <NavLinks items={items} pathname={pathname} variant="sidebar" />
        </nav>
        <div className="shrink-0 border-t border-sidebar-border p-3">
          {isLlm ? (
            <p className="mb-2 flex items-center gap-1.5 px-1 text-[11px] text-sidebar-foreground/70">
              <Eye className="size-3.5" />
              View Only Access
            </p>
          ) : null}
          <div className="mb-2 px-1">
            <LocaleSwitcher locale={locale} />
          </div>
          <p className="mb-2 truncate px-1 text-xs text-sidebar-foreground/70">
            {name}
            <span className="ml-1 text-[10px] uppercase tracking-wide">
              · {role === "LLM_VIEWER" ? "LLM" : role === "USER" ? "Angler" : role === "HANDLER" ? "Operator" : "Admin"}
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
              Sign out
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
              Menu
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <BrandLogo size={28} className="h-7 w-7" />
                  {brandTitle(role)}
                </SheetTitle>
              </SheetHeader>
              <nav className="scrollbar-none mt-4 flex max-h-[70vh] flex-col gap-1 overflow-y-auto">
                <NavLinks
                  items={items}
                  pathname={pathname}
                  variant="sheet"
                  onNavigate={() => setOpen(false)}
                />
              </nav>
              <div className="mt-4 px-1">
                <LocaleSwitcher locale={locale} />
              </div>
              {isLlm ? (
                <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <AlertTriangle className="size-3.5" />
                  No administrative functions
                </p>
              ) : null}
              <form action={logoutAction} className="mt-6">
                <Button
                  type="submit"
                  variant="outline"
                  className="min-h-11 w-full justify-start gap-2"
                >
                  <LogOut className="size-4" />
                  Sign out
                </Button>
              </form>
            </SheetContent>
          </Sheet>
          <div className="scrollbar-none flex min-w-0 flex-1 gap-1 overflow-x-auto">
            {items.slice(0, 4).map((item) => {
              const active =
                pathname === item.href ||
                pathname.startsWith(item.href + "/");
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
                  <Icon className="size-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
  ) : (
    <nav className="flex shrink-0 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] lg:hidden">
      <NavLinks items={items} pathname={pathname} variant="bottom" />
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
  if (isPassReceiptPath(pathname)) return null;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6 lg:hidden">
      <span className="flex items-center gap-2 text-sm font-semibold tracking-tight">
        <BrandLogo size={28} className="h-7 w-7" />
        {title ?? "TiangPass"}
      </span>
      <LocaleSwitcher locale={locale} />
    </header>
  );
}
