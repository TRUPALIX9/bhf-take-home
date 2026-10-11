/**
 * Root layout: wraps every route in <html>, <body>, fonts and the app header. Server Component.
 * Next.js renders it once and keeps it mounted across navigations; pages render into {children}.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

// --- Fonts ---
// next/font downloads the fonts at build time and self-hosts them, so there is no
// request to Google at runtime. Each one exposes a CSS variable that globals.css maps
// to Tailwind's font-sans / font-mono.
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

// --- Metadata ---
// Child pages set only their own title; the template adds the " · PO Review" suffix.
export const metadata: Metadata = {
  title: { default: "PO Review · BHF", template: "%s · PO Review" },
  description: "Review vendor purchase orders before they go to downstream systems.",
};

// --- Render ---
/** App shell shared by every page: header bar plus a centered main column. */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // The font classes only define the CSS variables; font-sans on <body> applies them.
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable}`}>
      <body className="font-sans text-sm antialiased">
        <header className="border-b border-line">
          <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              {/* Decorative logo mark; the "BHF" text next to it is the accessible name. */}
              <span
                aria-hidden
                className="grid size-7 place-items-center rounded bg-accent text-xs font-semibold text-inverse"
              >
                B
              </span>
              BHF
            </Link>
            <span className="h-5 w-px bg-line" aria-hidden />
            <span className="text-muted">Purchase order review</span>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </body>
    </html>
  );
}
