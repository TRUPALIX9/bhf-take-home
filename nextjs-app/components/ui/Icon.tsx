/**
 * A few line icons drawn as inline SVG, so there is no icon library to download.
 * They use currentColor, so they take the text color of whatever wraps them.
 * Decorative only (aria-hidden): every icon sits next to a text label.
 */

const paths = {
  // circle with a check: done
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  // chevron pointing down: expand / collapse
  chevron: (
    <>
      <path d="m6 9 6 6 6-6" />
    </>
  ),
  // circle with "i": more information
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  // funnel: filters
  filter: (
    <>
      <path d="M4 5h16l-6 7.5V19l-4-2v-4.5L4 5Z" />
    </>
  ),
  // triangle with "!": something failed
  alert: (
    <>
      <path d="M10.3 4.2 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9.5v4M12 17h.01" />
    </>
  ),
  // magnifier: not found
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  // two sheets: copy
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a1 1 0 0 1 1-1h9" />
    </>
  ),
} as const;

export type IconName = keyof typeof paths;

/** Renders one icon at 20px by default. */
export function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {paths[name]}
    </svg>
  );
}
