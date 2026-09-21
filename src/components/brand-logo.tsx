import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  /** Pixel height hint for Next Image sizing (width scales). */
  size?: number;
  priority?: boolean;
};

/**
 * Official TiangPass mark (transparent PNG). Use in nav, auth, and marketing chrome.
 */
export function BrandLogo({
  className,
  size = 32,
  priority = false,
}: BrandLogoProps) {
  return (
    <Image
      src="/brand/tiangpass-logo.png"
      alt="TiangPass"
      width={size}
      height={size}
      className={cn("h-8 w-8 object-contain", className)}
      priority={priority}
    />
  );
}
