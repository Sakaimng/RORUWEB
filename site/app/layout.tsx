import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ClientPageEntrance } from "@/components/ClientPageEntrance";
import { EventAnnouncementPopup } from "@/components/EventAnnouncementPopup";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { HeroScrollCue } from "@/components/HeroScrollCue";
import { Navigation } from "@/components/Navigation";
import { OrderCartRoot } from "@/components/order/OrderCartRoot";
import { RoruLoader } from "@/components/roru/RoruLoader";
import { PageTransition } from "@/components/roru/PageTransition";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import { ScrollRestoration } from "@/components/ScrollRestoration";
import { JsonLd } from "@/components/JsonLd";
import { LanguageProvider } from "@/lib/i18n";
import { ORDER_ONLINE_ENABLED } from "@/lib/site-flags";
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
const GOOGLE_TAG_MANAGER_ID = "GTM-MD77MS5K";

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
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "black-translucent",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f54500" },
    { media: "(prefers-color-scheme: dark)", color: "#f54500" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
        <Script id="roru-google-tag-manager" strategy="beforeInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${GOOGLE_TAG_MANAGER_ID}');
          `}
        </Script>
      </head>
      <body
        className={`${geist.variable} min-h-screen overscroll-none bg-[var(--surface)] font-sans text-[var(--text)] antialiased`}
        suppressHydrationWarning
      >
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GOOGLE_TAG_MANAGER_ID}`}
            height="0"
            width="0"
            title="Google Tag Manager"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <JsonLd data={siteGraph()} />
        <GoogleAnalytics />
        <LanguageProvider>
          <EventAnnouncementPopup />
          {ORDER_ONLINE_ENABLED ? (
            <OrderCartRoot>
              <ScrollRestoration />
              <PageTransition />
              <ClientPageEntrance />
              <RoruLoader />
              <Navigation />
              <HeroScrollCue />
              <PwaInstallPrompt />
              {children}
            </OrderCartRoot>
          ) : (
            <>
              <ScrollRestoration />
              <PageTransition />
              <ClientPageEntrance />
              <RoruLoader />
              <Navigation />
              <HeroScrollCue />
              <PwaInstallPrompt />
              {children}
            </>
          )}
        </LanguageProvider>
      </body>
    </html>
  );
}
