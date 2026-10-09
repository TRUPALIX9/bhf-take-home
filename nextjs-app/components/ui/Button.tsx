import { Spinner } from "@/components/ui/Spinner";

type Variant = "primary" | "secondary";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-inverse hover:bg-accent-dark aria-disabled:bg-accent/80",
  secondary: "border border-line-strong bg-surface text-ink hover:bg-subtle",
};

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
    <button
      {...props}
      aria-disabled={pending || undefined}
      aria-busy={pending || undefined}
      onClick={(e) => {
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
