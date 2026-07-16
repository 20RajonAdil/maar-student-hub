/** Global footer — brand + copyright, per spec. */
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface/60">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
        <Logo />
        <p className="text-xs text-muted-foreground">
          © 2026 MAAR Student Hub. All Rights Reserved.
        </p>
      </div>
    </footer>
  );
}
