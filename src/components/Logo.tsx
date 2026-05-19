import { cn } from "@/lib/utils";

export function Logo({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={cn(className)} aria-hidden>
      <defs>
        <linearGradient id="argusGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="oklch(0.82 0.16 200)" />
          <stop offset="100%" stopColor="oklch(0.65 0.22 295)" />
        </linearGradient>
      </defs>
      <polygon points="32,4 56,18 56,46 32,60 8,46 8,18" stroke="url(#argusGrad)" strokeWidth="2" fill="none" />
      <ellipse cx="32" cy="32" rx="20" ry="10" stroke="url(#argusGrad)" strokeWidth="1.5" fill="none" />
      <ellipse cx="32" cy="32" rx="13" ry="6.5" stroke="url(#argusGrad)" strokeWidth="1.2" fill="none" opacity="0.7" />
      <circle cx="32" cy="32" r="3" fill="url(#argusGrad)" />
      <circle cx="32" cy="32" r="6" stroke="url(#argusGrad)" strokeWidth="0.8" fill="none" opacity="0.5" />
    </svg>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Logo size={28} />
      <span className="font-display text-lg font-semibold tracking-tight">
        ARGUS<span className="text-primary">.</span>
      </span>
    </div>
  );
}
