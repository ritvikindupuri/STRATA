import { cn } from "@/lib/utils";

/**
 * STRATA glyph — hexagonal aperture with concentric strata + scan dot.
 * Represents layered defense (hex shield) + autonomous observation (iris).
 */
export function Logo({ className, size = 28, animated = false }: { className?: string; size?: number; animated?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={cn(className)} aria-hidden>
      <defs>
        <linearGradient id="strataGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="oklch(0.86 0.16 70)" />
          <stop offset="100%" stopColor="oklch(0.74 0.11 195)" />
        </linearGradient>
        <radialGradient id="strataCore" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(0.93 0.13 75)" />
          <stop offset="100%" stopColor="oklch(0.74 0.11 195 / 0)" />
        </radialGradient>
      </defs>

      {/* Outer hex shield */}
      <path
        d="M32 3 L57 17 L57 47 L32 61 L7 47 L7 17 Z"
        stroke="url(#strataGrad)"
        strokeWidth="2"
        strokeLinejoin="round"
        opacity="0.9"
      />
      {/* Middle hex stratum */}
      <path
        d="M32 13 L48 22 L48 42 L32 51 L16 42 L16 22 Z"
        stroke="url(#strataGrad)"
        strokeWidth="1.4"
        strokeLinejoin="round"
        opacity="0.55"
      />
      {/* Inner hex stratum */}
      <path
        d="M32 22 L40 27 L40 37 L32 42 L24 37 L24 27 Z"
        stroke="url(#strataGrad)"
        strokeWidth="1.2"
        strokeLinejoin="round"
        opacity="0.85"
      />
      {/* Iris glow */}
      <circle cx="32" cy="32" r="9" fill="url(#strataCore)" />
      {/* Pupil / scan dot */}
      <circle cx="32" cy="32" r="2.6" fill="oklch(0.93 0.13 75)">
        {animated && (
          <animate attributeName="opacity" values="1;0.35;1" dur="2.4s" repeatCount="indefinite" />
        )}
      </circle>
      {/* Top scan tick */}
      <path d="M32 3 L32 9" stroke="url(#strataGrad)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function LogoMark({ className, animated = false }: { className?: string; animated?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Logo size={26} animated={animated} />
      <span className="font-display text-[15px] font-semibold tracking-[0.22em]">
        STRATA
      </span>
    </div>
  );
}
