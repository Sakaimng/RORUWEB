"use client";

import { useCallback, useLayoutEffect, useRef } from "react";

/**
 * Animates a content-sized pill between measured widths. CSS cannot transition
 * from one `auto` width to another, so the current width is captured before
 * the content changes and the next natural width is measured after it renders.
 */
export function usePillWidthTransition(contentKey: string) {
  const pillRef = useRef<HTMLDivElement>(null);
  const previousWidthRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const transitionEndRef = useRef<{
    element: HTMLDivElement;
    listener: (event: TransitionEvent) => void;
  } | null>(null);

  const stopActiveTransition = useCallback(() => {
    if (frameRef.current != null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    const activeTransition = transitionEndRef.current;
    if (activeTransition) {
      activeTransition.element.removeEventListener(
        "transitionend",
        activeTransition.listener,
      );
      transitionEndRef.current = null;
    }
  }, []);

  const capturePillWidth = useCallback(() => {
    const pill = pillRef.current;
    if (!pill) return;

    const width = pill.getBoundingClientRect().width;
    stopActiveTransition();
    pill.style.width = `${width}px`;
    previousWidthRef.current = width;
  }, [stopActiveTransition]);

  useLayoutEffect(() => {
    const pill = pillRef.current;
    const previousWidth = previousWidthRef.current;
    if (!pill || previousWidth == null) return;

    previousWidthRef.current = null;
    pill.style.width = "";
    const nextWidth = pill.getBoundingClientRect().width;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reducedMotion || Math.abs(nextWidth - previousWidth) < 0.5) {
      return;
    }

    pill.style.width = `${previousWidth}px`;
    void pill.offsetWidth;

    const listener = (event: TransitionEvent) => {
      if (event.target !== pill || event.propertyName !== "width") return;
      pill.style.width = "";
      pill.removeEventListener("transitionend", listener);
      transitionEndRef.current = null;
    };

    pill.addEventListener("transitionend", listener);
    transitionEndRef.current = { element: pill, listener };
    frameRef.current = window.requestAnimationFrame(() => {
      pill.style.width = `${nextWidth}px`;
      frameRef.current = null;
    });

    return stopActiveTransition;
  }, [contentKey, stopActiveTransition]);

  return { pillRef, capturePillWidth };
}
