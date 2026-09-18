"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Anchor,
  CalendarDays,
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

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

function navForRole(role: UserRole): NavItem[] {
  if (role === "ADMIN") {
    return [
      { href: "/admin/ops", label: "Ops", icon: LayoutDashboard },
      { href: "/admin/jetties", label: "Jetties", icon: Anchor },
      { href: "/admin/locations", label: "Locations", icon: MapPinned },
      { href: "/admin/payments", label: "Payments", icon: Wallet },
      { href: "/admin/users", label: "People", icon: Users },
      { href: "/admin/reports", label: "Reports", icon: FileBarChart },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ];
  }
  if (role === "HANDLER") {
    return [
      { href: "/handler", label: "Schedule", icon: CalendarDays },
      { href: "/handler/scan", label: "Scan", icon: QrCode },
      { href: "/handler/boat", label: "Fleet", icon: Ship },
      { href: "/handler/earnings", label: "Earnings", icon: Wallet },
    ];
  }
  return [
    { href: "/book", label: "Book", icon: Anchor },
    { href: "/trips", label: "Trips", icon: Ticket },
    { href: "/profile", label: "Profile", icon: Users },
  ];
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
              "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
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
}: {
  role: UserRole;
  name?: string | null;
}) {
  const pathname = usePathname();
  const items = navForRole(role);
  const [open, setOpen] = useState(false);
  const isAdmin = role === "ADMIN";

  return (
    <>
      <aside className="hidden md:flex md:w-56 md:flex-col md:border-r md:border-sidebar-border md:bg-sidebar">
        <div className="flex h-14 items-center px-4">
          <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
            PortMaster
          </span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-2 pb-2">
          <NavLinks items={items} pathname={pathname} variant="sidebar" />
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <p className="mb-2 truncate px-1 text-xs text-sidebar-foreground/70">
            {name}
            <span className="ml-1 text-[10px] uppercase tracking-wide">
              · {role}
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

      {isAdmin ? (
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2 border-t border-border bg-background px-3 py-2 md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-muted">
              <Menu className="size-4" />
              Menu
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetHeader>
                <SheetTitle>PortMaster</SheetTitle>
              </SheetHeader>
              <nav className="mt-4 flex flex-col gap-1">
                <NavLinks
                  items={items}
                  pathname={pathname}
                  variant="sheet"
                  onNavigate={() => setOpen(false)}
                />
              </nav>
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
          <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
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
        <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-background md:hidden">
          <NavLinks items={items} pathname={pathname} variant="bottom" />
        </nav>
      )}
    </>
  );
}

export function MobileTopBar({ title }: { title?: string }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6 md:hidden">
      <span className="text-sm font-semibold tracking-tight">
        {title ?? "PortMaster"}
      </span>
    </header>
  );
}
