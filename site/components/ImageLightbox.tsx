"use client";

import Image from "next/image";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PREOPTIMIZED_IMAGE } from "@/lib/image-display";

function clampIndex(i: number, len: number): number {
  if (len <= 0) return 0;
  return ((i % len) + len) % len;
}

type Props = {
  images: readonly string[];
  active: number;
  onClose: () => void;
  onChange: (index: number) => void;
};

export function ImageLightbox({ images, active, onClose, onChange }: Props) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const prevOverflowRef = useRef<string | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const [lightboxRoot, setLightboxRoot] = useState<HTMLElement | null>(null);

  const TOUCH_SWIPE_THRESHOLD_PX = 44;

  useLayoutEffect(() => {
    setLightboxRoot(document.body);
  }, []);

  const next = useCallback(
    () => onChange(clampIndex(active + 1, images.length)),
    [active, images.length, onChange]
  );
  const prev = useCallback(
    () => onChange(clampIndex(active - 1, images.length)),
    [active, images.length, onChange]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    prevOverflowRef.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => {
      closeBtnRef.current?.focus();
    });
    return () => {
      document.body.style.overflow = prevOverflowRef.current ?? "";
      prevOverflowRef.current = null;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, onClose, prev]);

  useEffect(() => {
    if (!images.length) return;
    const preload = [active + 1, active - 1]
      .map((i) => clampIndex(i, images.length))
      .filter((i) => i !== active);
    for (const i of preload) {
      const img = new window.Image();
      img.src = images[i]!;
    }
  }, [active, images]);

  function onTouchStart(event: React.TouchEvent) {
    touchStartXRef.current = event.touches[0]?.clientX ?? null;
  }

  function onTouchEnd(event: React.TouchEvent) {
    const startX = touchStartXRef.current;
    const endX = event.changedTouches[0]?.clientX ?? null;
    touchStartXRef.current = null;
    if (startX == null || endX == null) return;

    const delta = startX - endX;
    if (Math.abs(delta) < TOUCH_SWIPE_THRESHOLD_PX) return;
    if (delta > 0) next();
    else prev();
  }

  const root = lightboxRoot;
  if (!root || !images.length) return null;

  return createPortal(
    <div className="roru-lightbox" role="dialog" aria-modal="true" aria-label="Image viewer">
      <div
        className="roru-lightbox__viewport"
        onClick={onClose}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="roru-lightbox__stage" onClick={(e) => e.stopPropagation()}>
          <Image
            src={images[active]!}
            alt=""
            fill
            className="roru-lightbox__image"
            priority
            sizes="(max-width: 1180px) 96vw, 1180px"
            {...PREOPTIMIZED_IMAGE}
          />
        </div>
      </div>

      <div className="roru-lightbox__header-slot" aria-hidden>
        <div className="roru-lightbox__header-slot-inner">
          <button
            type="button"
            ref={closeBtnRef}
            className="roru-lightbox__close roru-nav-item shrink-0 px-0 py-2 text-xs font-bold uppercase leading-none transition-opacity hover:opacity-70"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Close gallery viewer"
          >
            Close
          </button>
        </div>
      </div>

      <button
        type="button"
        className="roru-lightbox__nav roru-lightbox__nav--prev"
        onClick={(e) => {
          e.stopPropagation();
          prev();
        }}
        aria-label="Previous image"
      >
        <span aria-hidden="true">←</span>
      </button>

      <button
        type="button"
        className="roru-lightbox__nav roru-lightbox__nav--next"
        onClick={(e) => {
          e.stopPropagation();
          next();
        }}
        aria-label="Next image"
      >
        <span aria-hidden="true">→</span>
      </button>
    </div>,
    root
  );
}
