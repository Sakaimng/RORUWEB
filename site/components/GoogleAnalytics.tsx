import Script from "next/script";
import { AnalyticsPageView } from "@/components/AnalyticsPageView";
import {
  GA_CROSS_DOMAIN_HOSTS,
  GA_MEASUREMENT_ID,
} from "@/lib/analytics";

export function GoogleAnalytics() {
  if (!GA_MEASUREMENT_ID) return null;

  const crossDomainHosts = JSON.stringify(GA_CROSS_DOMAIN_HOSTS);
  const configuration = JSON.stringify({
    send_page_view: false,
  });

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
          GA_MEASUREMENT_ID,
        )}`}
        strategy="afterInteractive"
      />
      <Script id="roru-ga4-config" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          window.gtag = window.gtag || function () {
            window.dataLayer.push(arguments);
          };
          window.gtag("js", new Date());
          window.gtag("set", "linker", { domains: ${crossDomainHosts} });
          window.gtag("config", ${JSON.stringify(GA_MEASUREMENT_ID)}, ${configuration});
          window.__roruAnalyticsReady = true;
          window.dispatchEvent(new Event("roru:analytics-ready"));
        `}
      </Script>
      <AnalyticsPageView />
    </>
  );
}
