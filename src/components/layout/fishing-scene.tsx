import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Official TiangPass scene art (bridge + fish + boat) with a brush-painted edge.
 * Softened so it sits on the harbor-blue marketing wash.
 */
export function FishingScene({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-xl select-none",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[10%] rounded-[42%] bg-[radial-gradient(ellipse_at_center,_oklch(0.72_0.05_250_/_0.18)_0%,_transparent_72%)]"
      />
      <Image
        src="/brand/tiangpass-scene-brush.png"
        alt="Penang Bridge fishing — TiangPass"
        width={1576}
        height={1222}
        className="relative h-auto w-full opacity-[0.76] drop-shadow-[0_18px_40px_oklch(0.22_0.045_255_/_0.12)]"
        sizes="(max-width: 1024px) 90vw, 560px"
        priority
      />
    </div>
  );
}
