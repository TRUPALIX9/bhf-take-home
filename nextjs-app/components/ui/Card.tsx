/**
 * White box with a hairline border. The one container style used across the app.
 * Server-safe: no hooks. Renders a <section>; the optional title becomes its h2.
 */
export function Card({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`flex min-w-0 flex-col gap-3 rounded-lg border border-line bg-surface p-4 ${className}`}>
      {title && <h2 className="text-base font-semibold">{title}</h2>}
      {children}
    </section>
  );
}
