/**
 * Small spinning ring, used in Button and the active status tab. No hooks.
 * Uses the current text color; stops when reduced motion is on. aria-hidden because
 * the caller already says it is busy (aria-busy or the button label).
 */
/** A ring with one transparent side; spinning it reads as a loader. */
export function Spinner({ className = "size-4" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin ${className}`}
    />
  );
}
