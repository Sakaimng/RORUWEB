"use client";

import { useEffect } from "react";

/** Force document scroll top (covers `window`, `html`, and `body` quirks). */
function scrollToTop() {
  if (typeof window === "undefined") return;
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

/**
 * Manual scroll restoration + jump to top on load/reload.
 * Runs from root layout so every route gets a top scroll on full page load or refresh.
 */
export function ScrollRestoration() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      if ("scrollRestoration" in history) {
        history.scrollRestoration = "manual";
      }
    } catch {
      /* ignore */
    }

    scrollToTop();
    requestAnimationFrame(() => {
      scrollToTop();
      requestAnimationFrame(scrollToTop);
    });

    const onLoad = () => scrollToTop();
    window.addEventListener("load", onLoad);

    /* Avoid fighting bfcache restores (persisted === true); refresh has persisted false */
    const onPageShow = (e: PageTransitionEvent) => {
      if (!e.persisted) scrollToTop();
    };
    window.addEventListener("pageshow", onPageShow);

    const t1 = window.setTimeout(scrollToTop, 0);
    const t2 = window.setTimeout(scrollToTop, 150);

    return () => {
      window.removeEventListener("load", onLoad);
      window.removeEventListener("pageshow", onPageShow);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  return null;
}
