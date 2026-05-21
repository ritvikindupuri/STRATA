import { cn } from "@/lib/utils";

export function Logo({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={cn(className)} aria-hidden>
      <defs>
        <linearGradient id="strataGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="oklch(0.82 0.16 200)" />
          <stop offset="100%" stopColor="oklch(0.65 0.22 295)" />
        </linearGradient>
      </defs>
      {/* Layered strata — stacked defense layers, narrowing upward like a pyramid of protection */}
      <path d="M10 46 L54 46" stroke="url(#strataGrad)" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
      <path d="M16 36 L48 36" stroke="url(#strataGrad)" strokeWidth="3" strokeLinecap="round" opacity="0.65" />
      <path d="M22 26 L42 26" stroke="url(#strataGrad)" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
      <path d="M28 16 L36 16" stroke="url(#strataGrad)" strokeWidth="3" strokeLinecap="round" />
      {/* Threat marker — single intercepted pulse */}
      <circle cx="32" cy="16" r="2.2" fill="url(#strataGrad)" />
    </svg>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Logo size={26} />
      <span className="font-display text-[15px] font-semibold tracking-[0.18em]">
        STRATA
      </span>
    </div>
  );
}
