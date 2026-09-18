"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const ANGLER_PREFIXES = ["/", "/book", "/trips", "/profile", "/login", "/signup", "/policy", "/consent", "/offline"];

function isAnglerRoute(pathname: string) {
  if (pathname.startsWith("/admin") || pathname.startsWith("/handler") || pathname.startsWith("/api")) {
    return false;
  }
  return ANGLER_PREFIXES.some(
    (p) => pathname === p || (p !== "/" && pathname.startsWith(p)),
  ) || pathname === "/";
}

export function PwaRegister() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (!isAnglerRoute(pathname)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // ignore registration failures in dev
    });
  }, [pathname]);

  return null;
}
