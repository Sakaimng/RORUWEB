import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { RoruLoader } from "@/components/roru/RoruLoader";
import { PageTransition } from "@/components/roru/PageTransition";
import { ScrollRestoration } from "@/components/ScrollRestoration";
import { JsonLd } from "@/components/JsonLd";
import { LanguageProvider } from "@/lib/i18n";
import {
  SITE_URL,
  SITE_NAME,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  OG_IMAGE,
  absoluteUrl,
  buildLanguageAlternates,
} from "@/lib/seo";
import { siteGraph } from "@/lib/structured-data";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  weight: ["700"],
  display: "swap",
  adjustFontFallback: true,
});

const HOME_TITLE = "RORUBARU — Hand Roll & Temaki Bar in Wan Chai, Hong Kong";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: HOME_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: SITE_KEYWORDS,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "restaurant",
  alternates: {
    canonical: absoluteUrl("/"),
    languages: buildLanguageAlternates("/"),
  },
  openGraph: {
    title: HOME_TITLE,
    description: SITE_DESCRIPTION,
    url: absoluteUrl("/"),
    siteName: SITE_NAME,
    locale: "en_HK",
    alternateLocale: ["ja_JP", "zh_HK"],
    type: "website",
    images: [
      {
        url: OG_IMAGE.url,
        width: OG_IMAGE.width,
        height: OG_IMAGE.height,
        alt: OG_IMAGE.alt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE.url],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  // Set NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION in env to verify Search Console.
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="theme-day roru-preload" suppressHydrationWarning>
      <head>
        <link
          rel="preconnect"
          href="https://images.squarespace-cdn.com"
          crossOrigin="anonymous"
        />
      </head>
      <body
        className={`${geist.variable} min-h-screen overscroll-none bg-[var(--surface)] font-sans text-[var(--text)] antialiased`}
        suppressHydrationWarning
      >
        <JsonLd data={siteGraph()} />
        <LanguageProvider>
          <ScrollRestoration />
          <PageTransition />
          <RoruLoader />
          <Navigation />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
