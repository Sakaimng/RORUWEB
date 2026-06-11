"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { shouldShowScrollCue } from "@/lib/scroll-cue";
import { SCROLL_TO_TOP_EVENT } from "@/lib/scroll-to-top";

/** Scroll hint on all pages — fixed near bottom; tone follows nav (light/dark backgrounds). */
export function HeroScrollCue() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function sync() {
      setVisible(shouldShowScrollCue());
    }

    sync();

    window.addEventListener("roru:home-panel-change", sync);
    window.addEventListener("roru:about-section-change", sync);
    document.addEventListener("scroll", sync, { passive: true, capture: true });
    window.addEventListener(SCROLL_TO_TOP_EVENT, sync);

    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      window.removeEventListener("roru:home-panel-change", sync);
      window.removeEventListener("roru:about-section-change", sync);
      document.removeEventListener("scroll", sync, true);
      window.removeEventListener(SCROLL_TO_TOP_EVENT, sync);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      className={`roru-hero-scroll-cue${visible ? " is-visible" : ""}`}
      aria-hidden={!visible}
    >
      <span className="roru-hero-scroll-cue__label">{t.scrollCue}</span>
      <span className="roru-hero-scroll-cue__track">
        <span className="roru-hero-scroll-cue__dot" />
      </span>
    </div>
  );
}
