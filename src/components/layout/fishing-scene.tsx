import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Official TiangPass scene art (bridge + fish + boat).
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
        className="pointer-events-none absolute inset-[-6%] rounded-full bg-[radial-gradient(circle,_oklch(0.72_0.05_250_/_0.16)_0%,_transparent_70%)]"
      />
      <Image
        src="/brand/tiangpass-scene.png"
        alt="Penang Bridge fishing — TiangPass"
        width={900}
        height={832}
        className="relative h-auto w-full opacity-80 drop-shadow-[0_16px_36px_oklch(0.22_0.045_255_/_0.16)]"
        sizes="(max-width: 1024px) 90vw, 560px"
        priority
      />
    </div>
  );
}
