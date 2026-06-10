"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { runPostLoaderSequence } from "@/lib/home-entrance";
import { revealPageContent } from "@/lib/navigate-with-transition";
import { isHomePathname } from "@/lib/roru-path";
import { SITE_ENTERED_KEY, TRANSITION_PENDING_KEY } from "@/lib/roru-session";

/**
 * Ensures page content is visible after client navigations that bypass the
 * transition overlay (e.g. a stale direct router.push). PageTransition handles
 * the normal fade-in path when TRANSITION_PENDING is set.
 */
export function ClientPageEntrance() {
  const pathname = usePathname() ?? "";

  useEffect(() => {
    let cancelled = false;

    function tryReveal() {
      if (cancelled) return;
      try {
        if (sessionStorage.getItem(SITE_ENTERED_KEY) !== "1") return;
        if (sessionStorage.getItem(TRANSITION_PENDING_KEY) === "1") return;
      } catch {
        return;
      }
      if (document.documentElement.classList.contains("roru-loading")) return;
      if (document.documentElement.classList.contains("roru-preload")) return;

      revealPageContent();

      const stuckReveal = document.querySelector(
        ".homepage-reveal:not(.homepage-reveal--settled):not(#roru-nav)",
      );
      if (!stuckReveal) return;

      runPostLoaderSequence(false, isHomePathname(pathname));
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(tryReveal);
    });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}
