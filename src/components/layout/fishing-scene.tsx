import { cn } from "@/lib/utils";

/** Inline SVG: Penang bridge pillars + sampan on water. */
export function FishingScene({ className }: { className?: string }) {
  return (
    <div className={cn("relative w-full", className)}>
      <svg
        viewBox="0 0 560 420"
        className="h-auto w-full"
        role="img"
        aria-label="Fishing boat near bridge pillars"
      >
        <defs>
          <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.78 0.04 240)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="oklch(0.55 0.06 240)" stopOpacity="0.55" />
          </linearGradient>
          <linearGradient id="pillar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.35 0.04 250)" />
            <stop offset="100%" stopColor="oklch(0.22 0.045 255)" />
          </linearGradient>
        </defs>

        {/* Horizon water */}
        <rect x="0" y="250" width="560" height="170" fill="url(#water)" />
        <path
          className="animate-[drift_8s_ease-in-out_infinite]"
          d="M0 270 Q70 262 140 270 T280 270 T420 270 T560 270 L560 420 L0 420 Z"
          fill="oklch(0.72 0.05 235 / 0.25)"
        />
        <path
          className="animate-[drift_10s_ease-in-out_infinite_reverse]"
          d="M0 300 Q90 290 180 300 T360 300 T540 300 L560 300 L560 420 L0 420 Z"
          fill="oklch(0.62 0.05 240 / 0.2)"
          style={{ animationDelay: "1s" }}
        />

        {/* Bridge deck */}
        <rect
          x="40"
          y="88"
          width="480"
          height="14"
          rx="2"
          fill="oklch(0.28 0.04 255)"
        />
        <rect
          x="40"
          y="78"
          width="480"
          height="8"
          rx="1"
          fill="oklch(0.4 0.05 250)"
        />

        {/* Pillars / tiang */}
        {[100, 180, 260, 340, 420].map((x, i) => (
          <g key={x}>
            <rect
              x={x}
              y="102"
              width="28"
              height="200"
              fill="url(#pillar)"
              rx="2"
            />
            <rect
              x={x + 4}
              y="102"
              width="8"
              height="200"
              fill="oklch(0.45 0.03 250 / 0.35)"
            />
            <text
              x={x + 14}
              y="130"
              textAnchor="middle"
              fill="oklch(0.92 0.02 250 / 0.7)"
              fontSize="11"
              fontFamily="ui-sans-serif, system-ui"
            >
              {i + 1}
            </text>
          </g>
        ))}

        {/* Sampan */}
        <g className="animate-[bob_5s_ease-in-out_infinite]" transform="translate(300 288)">
          <ellipse cx="70" cy="28" rx="78" ry="10" fill="oklch(0.3 0.04 250 / 0.2)" />
          <path
            d="M8 18 C28 8, 112 8, 132 18 L124 30 C100 38, 40 38, 16 30 Z"
            fill="oklch(0.32 0.05 55)"
          />
          <path
            d="M20 18 C40 12, 100 12, 120 18 L116 24 C96 20, 44 20, 24 24 Z"
            fill="oklch(0.42 0.06 55)"
          />
          <line
            x1="70"
            y1="6"
            x2="70"
            y2="22"
            stroke="oklch(0.25 0.03 255)"
            strokeWidth="2"
          />
          <circle cx="70" cy="5" r="3" fill="oklch(0.55 0.08 45)" />
        </g>
      </svg>

      <style>{`
        @keyframes drift {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(12px); }
        }
        @keyframes bob {
          0%, 100% { transform: translate(300px, 288px); }
          50% { transform: translate(300px, 282px); }
        }
      `}</style>
    </div>
  );
}
