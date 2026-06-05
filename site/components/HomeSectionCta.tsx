"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";

type SectionCta = {
  id: string;
  title: string;
  href: string;
};

export function HomeSectionCta() {
  const { t } = useI18n();
  const [item, setItem] = useState<SectionCta | null>(null);
  const [hidden, setHidden] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const lastItemRef = useRef<SectionCta | null>(null);
  const currentIdRef = useRef<string | null>(null);
  const switchTimerRef = useRef<number | null>(null);

  useEffect(() => {
    function onPanelChange(event: Event) {
      const detail = (event as CustomEvent<{ item: SectionCta | null }>).detail;
      const next = detail?.item ?? null;
      const nextId = next?.id ?? null;
      if (nextId === currentIdRef.current) return;
      currentIdRef.current = nextId;

      if (!next) {
        setHidden(true);
        return;
      }

      setHidden(false);

      if (lastItemRef.current && lastItemRef.current.id !== next.id) {
        setIsSwitching(true);
        if (switchTimerRef.current != null) {
          window.clearTimeout(switchTimerRef.current);
        }
        switchTimerRef.current = window.setTimeout(() => {
          setItem(next);
          lastItemRef.current = next;
          setIsSwitching(false);
        }, 160);
      } else {
        setItem(next);
        lastItemRef.current = next;
      }
    }

    window.addEventListener("roru:home-panel-change", onPanelChange as EventListener);

    return () => {
      if (switchTimerRef.current != null) window.clearTimeout(switchTimerRef.current);
      window.removeEventListener("roru:home-panel-change", onPanelChange as EventListener);
    };
  }, []);

  const shown = item ?? lastItemRef.current;
  if (!shown) return null;

  // Translate the panel title by id ("APPOINTMENT" stays English).
  const titleById: Record<string, string> = {
    about: t.nav.about,
    events: t.cta.events,
    inquire: t.cta.inquire,
    reserve: t.booking.pageTitle,
  };
  const title = titleById[shown.id] ?? shown.title;

  const isExternal = /^https?:\/\//.test(shown.href);
  const classes = [
    "roru-home-discover",
    hidden ? "is-hidden" : "",
    isSwitching ? "is-switching" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} aria-live="polite" aria-hidden={hidden}>
      <div className="roru-home-discover__title">{title}</div>
      <a
        className="roru-home-discover__button"
        href={shown.href}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noreferrer" : undefined}
      >
        {t.cta.discover}
      </a>
    </div>
  );
}
