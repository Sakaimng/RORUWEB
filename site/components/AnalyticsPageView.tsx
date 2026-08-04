"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackAnalyticsEvent } from "@/lib/analytics";

const ANALYTICS_READY_EVENT = "roru:analytics-ready";

export function AnalyticsPageView() {
  const pathname = usePathname();

  useEffect(() => {
    function sendPageView() {
      trackAnalyticsEvent("page_view", {
        page_location: window.location.href,
        page_path: `${pathname}${window.location.search}`,
        page_title: document.title,
      });
    }

    if ((window as Window & { __roruAnalyticsReady?: boolean }).__roruAnalyticsReady) {
      sendPageView();
      return;
    }

    window.addEventListener(ANALYTICS_READY_EVENT, sendPageView, { once: true });
    return () => window.removeEventListener(ANALYTICS_READY_EVENT, sendPageView);
  }, [pathname]);

  return null;
}
