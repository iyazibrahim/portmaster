import { cn } from "@/lib/utils";

const PLUS_GRID =
  "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%230c2340' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")";

/** Soft harbor-blue wash + plus grid (landing/auth). */
export function MarketingBackground({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0", className)}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_oklch(0.94_0.03_250)_0%,_transparent_55%),linear-gradient(180deg,_oklch(0.985_0.006_250)_0%,_oklch(0.96_0.02_250)_100%)]" />
      <div
        className="absolute inset-x-0 bottom-0 h-1/2 opacity-[0.07]"
        style={{ backgroundImage: PLUS_GRID }}
      />
    </div>
  );
}
