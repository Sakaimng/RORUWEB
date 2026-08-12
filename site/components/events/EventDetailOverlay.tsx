"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { TockLink } from "@/components/TockLink";
import { trackTockReservationCheckout } from "@/lib/analytics";

type EventDetail = {
  title: string;
  schedule?: string;
  poster: string;
  bookingUrl?: string;
  caption: readonly string[];
};

type Props = {
  event: EventDetail;
  onClose: () => void;
};

const CLOSE_ANIMATION_MS = 280;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function EventDetailOverlay({ event, onClose }: Props) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousOverflowRef = useRef<string | null>(null);
  const closingRef = useRef(false);
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;

    if (prefersReducedMotion()) {
      onClose();
      return;
    }

    setIsClosing(true);
  }, [onClose]);

  useLayoutEffect(() => {
    setRoot(document.body);
  }, []);

  useEffect(() => {
    if (!isClosing) return;
    const timer = window.setTimeout(onClose, CLOSE_ANIMATION_MS);
    return () => window.clearTimeout(timer);
  }, [isClosing, onClose]);

  useEffect(() => {
    previousOverflowRef.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    return () => {
      document.body.style.overflow = previousOverflowRef.current ?? "";
      previousOverflowRef.current = null;
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      requestClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [requestClose]);

  if (!root) return null;

  return createPortal(
    <div
      className={`roru-event-detail${isClosing ? " roru-event-detail--closing" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="roru-event-detail-title"
    >
      <button
        type="button"
        className="roru-event-detail__backdrop"
        aria-label="Close event details"
        onClick={requestClose}
      />
      <section className="roru-event-detail__dialog">
        <button
          ref={closeButtonRef}
          type="button"
          className="roru-event-detail__close"
          onClick={requestClose}
        >
          Close
        </button>

        <div className="roru-event-detail__poster">
          <Image
            src={event.poster}
            alt={`${event.title} poster`}
            fill
            priority
            sizes="(max-width: 767px) min(88vw, 34rem), 34rem"
            className="roru-event-detail__poster-image"
          />
        </div>

        <div className="roru-event-detail__copy">
          <h2 id="roru-event-detail-title">{event.title}</h2>
          {event.schedule ? (
            <p className="roru-event-detail__schedule">{event.schedule}</p>
          ) : null}
          <div className="roru-event-detail__caption">
            {event.caption.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          {event.bookingUrl ? (
            <TockLink
              href={event.bookingUrl}
              campaign="event_detail"
              content={event.title}
              target="_blank"
              rel="noopener"
              className="roru-event-detail__booking"
              onClick={() =>
                trackTockReservationCheckout({
                  source: "event_detail",
                  eventName: event.title,
                })
              }
            >
              Book on Tock
            </TockLink>
          ) : null}
        </div>
      </section>
    </div>,
    root,
  );
}
