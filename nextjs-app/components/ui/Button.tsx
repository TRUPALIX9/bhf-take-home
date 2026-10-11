/**
 * Shared button and link styles. Button has an onClick wrapper but no hooks, so it can be
 * used by Client Components (ReviewPanel, ErrorState) without its own "use client".
 */

import { Spinner } from "@/components/ui/Spinner";

type Variant = "primary" | "secondary" | "danger" | "danger-solid";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-inverse hover:bg-accent-dark aria-disabled:bg-accent/80",
  secondary: "border border-line-strong bg-surface text-ink hover:bg-subtle",
  danger: "border border-danger/40 bg-surface text-danger hover:bg-danger/5", // Request correction
  "danger-solid": "bg-danger text-inverse hover:bg-danger/90", // confirm a correction request
};

/** Button look for a <Link>, so links and buttons in one row match. */
export function buttonClass(variant: Variant = "primary") {
  return `inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 font-medium transition-colors ${variants[variant]}`;
}

/** Text link in the accent color. */
export const linkClass = "font-medium text-accent underline-offset-4 hover:underline";

/**
 * The one button style. While `pending`, it shows a spinner and ignores clicks,
 * but stays focusable (aria-disabled, not disabled) so keyboard focus isn't lost.
 */
export function Button({
  variant = "primary",
  pending = false,
  children,
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; pending?: boolean }) {
  return (
    // Spread first so the props below (aria, onClick, className) always win.
    <button
      {...props}
      aria-disabled={pending || undefined}
      aria-busy={pending || undefined}
      onClick={(e) => {
        // preventDefault also stops a type="submit" button from submitting the form again.
        if (pending) return e.preventDefault();
        onClick?.(e);
      }}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 font-medium transition-colors aria-disabled:cursor-wait ${variants[variant]}`}
    >
      {pending && <Spinner />}
      {children}
    </button>
  );
}
