"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { runPostLoaderSequence } from "@/lib/home-entrance";
import { SITE_ENTERED_KEY, TRANSITION_PENDING_KEY } from "@/lib/roru-session";

/**
 * When returning to `/` via browser back/forward (no transition overlay), the intro loader does not
 * run again — this mirrors `runPostLoaderSequence` so the hero and sections are visible.
 * Skips when a PageTransition is handling the same navigation (TRANSITION_PENDING).
 */
export function HomeClientEntrance() {
  const pathname = usePathname() ?? "";

  useEffect(() => {
    if (pathname !== "/") return;

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

      const firstTitle = document.querySelector(".roru-hero__title");
      if (!firstTitle) return;
      if (getComputedStyle(firstTitle as HTMLElement).visibility === "visible") return;

      runPostLoaderSequence(false, false);
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
