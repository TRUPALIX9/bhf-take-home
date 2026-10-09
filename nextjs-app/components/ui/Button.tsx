import { Spinner } from "@/components/ui/Spinner";

type Variant = "primary" | "secondary";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-dark disabled:bg-accent/80",
  secondary: "border border-line-strong bg-white text-ink hover:bg-subtle",
};

/** Shared button look. Also used for links that should look like buttons. */
export function buttonClass(variant: Variant = "primary") {
  return `inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 font-medium transition-colors disabled:cursor-wait ${variants[variant]}`;
}

/** Text link in the accent color. */
export const linkClass = "font-medium text-accent underline-offset-4 hover:underline";

export function Button({
  variant = "primary",
  pending = false,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; pending?: boolean }) {
  return (
    <button {...props} disabled={pending || props.disabled} className={buttonClass(variant)}>
      {pending && <Spinner />}
      {children}
    </button>
  );
}
