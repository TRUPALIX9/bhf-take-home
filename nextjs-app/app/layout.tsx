import type { Metadata } from "next";
import Link from "next/link";
import { Bodoni_Moda, IBM_Plex_Mono, Montserrat } from "next/font/google";
import "./globals.css";

const bodoni = Bodoni_Moda({ variable: "--font-bodoni", subsets: ["latin"], weight: ["500", "600"] });
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: { default: "PO Review · BHF", template: "%s · PO Review" },
  description: "Review vendor purchase orders before they go to downstream systems.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${bodoni.variable} ${montserrat.variable} ${plexMono.variable}`}>
      <body className="font-sans antialiased">
        <header className="border-b border-line">
          <div className="mx-auto flex max-w-6xl items-baseline gap-3 px-4 py-4 sm:px-6">
            <Link href="/" className="font-display text-2xl font-semibold tracking-wide text-ink">
              BHF
            </Link>
            <span className="label">PO Review</span>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
      </body>
    </html>
  );
}
