"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { SCROLL_TO_TOP_EVENT } from "@/lib/scroll-to-top";

function isHeroPanelActive(): boolean {
  return document.querySelector(".roru-home-overlay-panel--hero.is-active") != null;
}

/** Hero scroll hint — fixed below tagline; toggles with hero panel. */
export function HeroScrollCue() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    function sync() {
      setVisible(isHeroPanelActive());
    }

    sync();
    window.addEventListener("roru:home-panel-change", sync);
    window.addEventListener(SCROLL_TO_TOP_EVENT, sync);

    return () => {
      window.removeEventListener("roru:home-panel-change", sync);
      window.removeEventListener(SCROLL_TO_TOP_EVENT, sync);
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
