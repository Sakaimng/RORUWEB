"use client";

import { useEffect, useRef, useState } from "react";
import { usePillWidthTransition } from "@/components/usePillWidthTransition";

type PanelCta =
  | {
      id: string;
      title: string;
      action: "discover";
      href: string;
    }
  | {
      id: string;
      title: string;
      action: "gallery";
    }
  | {
      id: string;
      title: string;
      action: "detail";
    };

type Props = {
  onOpenGallery: (eventId: string) => void;
  onOpenDetail: (eventId: string) => void;
};

export function EventsPanelCta({ onOpenGallery, onOpenDetail }: Props) {
  const [item, setItem] = useState<PanelCta | null>(null);
  const [hidden, setHidden] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const lastItemRef = useRef<PanelCta | null>(null);
  const currentIdRef = useRef<string | null>(null);
  const switchTimerRef = useRef<number | null>(null);
  const shown = item ?? lastItemRef.current;
  const { pillRef, capturePillWidth } = usePillWidthTransition(
    shown ? `${shown.id}:${shown.title}` : "",
  );

  useEffect(() => {
    function onPanelChange(event: Event) {
      const detail = (event as CustomEvent<{ item: PanelCta | null }>).detail;
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
        capturePillWidth();
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
  }, [capturePillWidth]);

  if (!shown) return null;

  const classes = [
    "roru-home-discover",
    hidden ? "is-hidden" : "",
    isSwitching ? "is-switching" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={pillRef} className={classes} aria-live="polite" aria-hidden={hidden}>
      <div className="roru-home-discover__title">{shown.title}</div>
      {shown.action === "gallery" || shown.action === "detail" ? (
        <button
          type="button"
          className="roru-home-discover__button"
          onClick={() =>
            shown.action === "gallery"
              ? onOpenGallery(shown.id)
              : onOpenDetail(shown.id)
          }
        >
          {shown.action === "gallery" ? "Gallery" : "DETAIL"}
        </button>
      ) : (
        <a className="roru-home-discover__button" href={shown.href}>
          Discover
        </a>
      )}
    </div>
  );
}
