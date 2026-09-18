"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get(paramName) ?? "all";

  const options = useMemo(
    () => [
      { value: "all", label: "All jetties" },
      ...jetties.map((j) => ({ value: j.id, label: j.name })),
    ],
    [jetties],
  );

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete(paramName);
    else params.set(paramName, value);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="max-w-md space-y-1.5">
      <Label htmlFor="jetty-filter">Jetty</Label>
      <SearchableSelect
        options={options}
        value={current}
        onValueChange={onChange}
        placeholder="Filter by jetty"
        searchPlaceholder="Search jetties…"
      />
    </div>
  );
}
