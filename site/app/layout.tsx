import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { RoruLoader } from "@/components/roru/RoruLoader";
import { PageTransition } from "@/components/roru/PageTransition";
import { ScrollRestoration } from "@/components/ScrollRestoration";
import { ThemeClassSync } from "@/components/ThemeAndClock";
import { getHongKongHour } from "@/lib/content";

function initialHongKongThemeClass(): "theme-day" | "theme-night" {
  const h = getHongKongHour();
  return h >= 6 && h < 18 ? "theme-day" : "theme-night";
}

/* Only weights used in the UI (headings: thin–extralight; body/labels: normal–semibold). Dropping 700 cuts font bytes. */
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  weight: ["100", "200", "300", "400", "500", "600"],
  display: "swap",
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: "RORUBARU | Discover Fresh Hand Rolls – Book Now",
  description:
    "Experience Hong Kong's original hand roll bar with fresh, premium ingredients and Japanese nori. Enjoy expertly crafted rolls served fresh in a vibrant atmosphere.",
  openGraph: {
    title: "RORUBARU | Discover Fresh Hand Rolls – Book Now",
    description:
      "Experience Hong Kong's original hand roll bar with fresh, premium ingredients and Japanese nori.",
    url: "https://www.rorubaru.com",
    siteName: "RORUBARU",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeClass = initialHongKongThemeClass();
  return (
    <html
      lang="en"
      className={`${themeClass} roru-preload`}
      suppressHydrationWarning
    >
      <head>
        <link
          rel="preconnect"
          href="https://images.squarespace-cdn.com"
          crossOrigin="anonymous"
        />
      </head>
      <body
        className={`${geist.variable} min-h-screen overscroll-none bg-[var(--surface)] font-sans text-[var(--text)] antialiased`}
      >
        <ThemeClassSync />
        <ScrollRestoration />
        <PageTransition />
        <RoruLoader />
        <Navigation />
        {children}
      </body>
    </html>
  );
}
