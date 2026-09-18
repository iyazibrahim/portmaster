"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export type JettyFilterOption = {
  id: string;
  name: string;
};

export function JettyFilter({
  jetties,
  paramName = "jetty",
}: {
  jetties: JettyFilterOption[];
  paramName?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get(paramName) ?? "all";

  function hrefFor(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete(paramName);
    else params.set(paramName, value);
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={hrefFor("all")}
        className={cn(
          "inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium",
          current === "all"
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
      >
        All jetties
      </Link>
      {jetties.map((j) => (
        <Link
          key={j.id}
          href={hrefFor(j.id)}
          className={cn(
            "inline-flex min-h-11 max-w-[14rem] items-center truncate rounded-md px-3 text-sm font-medium",
            current === j.id
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
          title={j.name}
        >
          {j.name}
        </Link>
      ))}
    </div>
  );
}
