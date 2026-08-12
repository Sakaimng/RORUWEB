"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { RORU_AFTER_DARK_EVENT } from "@/lib/event-galleries";
import { useI18n } from "@/lib/i18n";
import { stripLocale, withLocale } from "@/lib/locale-routing";
import { navigateWithTransition } from "@/lib/navigate-with-transition";

const SESSION_KEY = "roru-event-announcement-seen";
const OPEN_DELAY_MS = 400;
const CLOSE_ANIMATION_MS = 280;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function hasSeenAnnouncement(): boolean {
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function markAnnouncementSeen(): void {
  try {
    window.sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    /* Private browsing can deny storage; the popup will still remain stable in-page. */
  }
}

export function EventAnnouncementPopup() {
  const { lang } = useI18n();
  const pathname = usePathname();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousOverflowRef = useRef<string | null>(null);
  const closingRef = useRef(false);
  const pendingNavigationRef = useRef<string | null>(null);
  const [open, setOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (stripLocale(pathname) === "/events" || hasSeenAnnouncement()) return;

    function tryOpen() {
      if (
        hasSeenAnnouncement() ||
        document.documentElement.classList.contains("roru-preload") ||
        document.documentElement.classList.contains("roru-loading")
      ) {
        return;
      }

      markAnnouncementSeen();
      setOpen(true);
    }

    const timer = window.setTimeout(tryOpen, OPEN_DELAY_MS);
    const observer = new MutationObserver(tryOpen);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [pathname]);

  const requestClose = useCallback((href?: string) => {
    if (closingRef.current) return;

    closingRef.current = true;
    pendingNavigationRef.current = href ?? null;

    if (prefersReducedMotion()) {
      setOpen(false);
      if (href) navigateWithTransition(href);
      return;
    }

    setIsClosing(true);
  }, []);

  useEffect(() => {
    if (!isClosing) return;

    const timer = window.setTimeout(() => {
      const href = pendingNavigationRef.current;
      setOpen(false);
      if (href) navigateWithTransition(href);
    }, CLOSE_ANIMATION_MS);

    return () => window.clearTimeout(timer);
  }, [isClosing]);

  useEffect(() => {
    if (!open) return;

    previousOverflowRef.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.classList.add("roru-event-announcement-open");
    window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      document.body.style.overflow = previousOverflowRef.current ?? "";
      previousOverflowRef.current = null;
      document.body.classList.remove("roru-event-announcement-open");
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      requestClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, requestClose]);

  if (!open) return null;

  return (
    <div
      className={`roru-event-announcement${
        isClosing ? " roru-event-announcement--closing" : ""
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="roru-event-announcement-title"
    >
      <button
        type="button"
        className="roru-event-announcement__backdrop"
        aria-label="Dismiss event announcement"
        onClick={() => requestClose()}
      />
      <section className="roru-event-announcement__panel">
        <button
          ref={closeButtonRef}
          type="button"
          className="roru-event-announcement__close"
          aria-label="Dismiss event announcement"
          onClick={() => requestClose()}
        >
          Close
        </button>
        <div className="roru-event-announcement__visual">
          <Image
            src={RORU_AFTER_DARK_EVENT.poster}
            alt="RORU After Dark event poster"
            fill
            priority
            sizes="(max-width: 767px) min(88vw, 30rem), 24rem"
            className="roru-event-announcement__image"
          />
        </div>
        <div className="roru-event-announcement__copy">
          <p className="roru-event-announcement__eyebrow">Coming soon</p>
          <h2 id="roru-event-announcement-title">
            {RORU_AFTER_DARK_EVENT.title}
          </h2>
          <p className="roru-event-announcement__schedule">
            {RORU_AFTER_DARK_EVENT.schedule}
          </p>
          <p className="roru-event-announcement__launch">Launching 21 August.</p>
          <button
            type="button"
            className="roru-event-announcement__cta"
            onClick={() => requestClose(withLocale("/events", lang))}
          >
            View event
          </button>
        </div>
      </section>
    </div>
  );
}
