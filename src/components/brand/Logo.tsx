/**
 * MAAR logo — geometric wordmark + stacked-square glyph.
 * Pure inline SVG so it inherits currentColor from context.
 */
import { cn } from "@/lib/utils";

export function Logo({ className, showWord = true }: { className?: string; showWord?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-display text-foreground", className)}>
      <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true" className="text-brand">
        <rect x="3" y="3" width="12" height="12" rx="3" fill="currentColor" />
        <rect x="17" y="3" width="12" height="12" rx="3" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <rect x="3" y="17" width="12" height="12" rx="3" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <rect x="17" y="17" width="12" height="12" rx="3" fill="currentColor" opacity="0.55" />
      </svg>
      {showWord && (
        <span className="font-semibold tracking-tight">
          MAAR<span className="text-muted-foreground font-normal"> Student Hub</span>
        </span>
      )}
    </span>
  );
}
