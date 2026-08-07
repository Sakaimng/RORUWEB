"use client";

import { useEffect, useRef } from "react";
import { clearNavTone, syncNavToneFromPanel } from "@/lib/nav-tone";
import { SCROLL_TO_TOP_EVENT } from "@/lib/scroll-to-top";

const LOCK_MS = 850;
const REDUCED_MOTION_LOCK_MS = 120;
const WHEEL_THRESHOLD = 18;
const TOUCH_THRESHOLD = 44;
const SCROLL_EDGE_PX = 2;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function getPanels(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(".roru-home-overlay-panel"));
}

function isScrollablePanel(panel: HTMLElement | undefined): panel is HTMLElement {
  return panel?.classList.contains("roru-home-overlay-panel--scrollable") ?? false;
}

function panelScrollBounds(panel: HTMLElement) {
  const maxScroll = panel.scrollHeight - panel.clientHeight;
  return {
    atTop: panel.scrollTop <= SCROLL_EDGE_PX,
    atBottom: panel.scrollTop >= maxScroll - SCROLL_EDGE_PX,
    canScroll: maxScroll > SCROLL_EDGE_PX,
  };
}

function shouldScrollPanel(panel: HTMLElement, deltaY: number): boolean {
  if (!isScrollablePanel(panel) || !panel.classList.contains("is-active")) return false;
  const { atTop, atBottom, canScroll } = panelScrollBounds(panel);
  if (!canScroll) return false;
  if (deltaY > 0) return !atBottom;
  if (deltaY < 0) return !atTop;
  return false;
}

function isLightboxInteraction(event?: Event): boolean {
  const modalSelector =
    ".roru-lightbox, .roru-event-detail, .roru-event-announcement";
  if (document.querySelector(modalSelector)) return true;
  const target = event?.target;
  return (
    target instanceof Element &&
    target.closest(modalSelector) !== null
  );
}

function itemForPanel(panel: HTMLElement | undefined) {
  if (!panel) return null;
  const id = panel.dataset.homeCtaId;
  const title = panel.dataset.homeCtaTitle;
  const href = panel.dataset.homeCtaHref;
  const action = panel.dataset.homeCtaAction ?? "discover";
  if (!id || !title) return null;

  if (action === "gallery") {
    return { id, title, action: "gallery" as const };
  }
  if (action === "detail") {
    return { id, title, action: "detail" as const };
  }

  if (!href) return null;
  return { id, title, href, action: "discover" as const };
}

function applyIndex(index: number) {
  const panels = getPanels();
  const clamped = Math.max(0, Math.min(panels.length - 1, index));

  document.documentElement.style.setProperty("--roru-home-active-index", String(clamped));
  document.documentElement.classList.toggle(
    "roru-home-footer-active",
    panels[clamped]?.classList.contains("roru-home-overlay-panel--footer") ?? false
  );

  panels.forEach((panel, panelIndex) => {
    panel.classList.toggle("is-active", panelIndex === clamped);
    panel.classList.toggle("is-before", panelIndex < clamped);
    panel.classList.toggle("is-after", panelIndex > clamped);
  });

  window.dispatchEvent(
    new CustomEvent("roru:home-panel-change", {
      detail: { item: itemForPanel(panels[clamped]) },
    })
  );

  syncNavToneFromPanel(panels[clamped]);

  return clamped;
}

export function HomeYslScroll() {
  const indexRef = useRef(0);
  const lockedRef = useRef(false);
  const touchStartYRef = useRef<number | null>(null);

  useEffect(() => {
    function step(direction: 1 | -1) {
      if (lockedRef.current) return;
      const panels = getPanels();
      if (!panels.length) return;

      const next = Math.max(0, Math.min(panels.length - 1, indexRef.current + direction));
      if (next === indexRef.current) return;

      lockedRef.current = true;
      indexRef.current = applyIndex(next);
      window.setTimeout(() => {
        lockedRef.current = false;
      }, prefersReducedMotion() ? REDUCED_MOTION_LOCK_MS : LOCK_MS);
    }

    function onWheel(event: WheelEvent) {
      if (isLightboxInteraction(event)) return;
      if (Math.abs(event.deltaY) < WHEEL_THRESHOLD) return;

      const panels = getPanels();
      const activePanel = panels[indexRef.current];
      if (activePanel && shouldScrollPanel(activePanel, event.deltaY)) return;

      event.preventDefault();
      step(event.deltaY > 0 ? 1 : -1);
    }

    function onTouchStart(event: TouchEvent) {
      if (isLightboxInteraction(event)) {
        touchStartYRef.current = null;
        return;
      }
      touchStartYRef.current = event.touches[0]?.clientY ?? null;
    }

    function onTouchMove(event: TouchEvent) {
      if (isLightboxInteraction(event)) return;
      const panels = getPanels();
      const activePanel = panels[indexRef.current];
      if (isScrollablePanel(activePanel) && activePanel.classList.contains("is-active")) {
        return;
      }
      if (touchStartYRef.current != null) event.preventDefault();
    }

    function onTouchEnd(event: TouchEvent) {
      if (isLightboxInteraction(event)) {
        touchStartYRef.current = null;
        return;
      }
      const startY = touchStartYRef.current;
      const endY = event.changedTouches[0]?.clientY ?? null;
      touchStartYRef.current = null;
      if (startY == null || endY == null) return;

      const delta = startY - endY;
      if (Math.abs(delta) < TOUCH_THRESHOLD) return;

      const panels = getPanels();
      const activePanel = panels[indexRef.current];
      if (activePanel && shouldScrollPanel(activePanel, delta)) return;

      step(delta > 0 ? 1 : -1);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (isLightboxInteraction()) return;
      if (event.defaultPrevented) return;
      if (event.key === "ArrowDown" || event.key === "PageDown" || event.key === " ") {
        event.preventDefault();
        step(1);
      } else if (event.key === "ArrowUp" || event.key === "PageUp") {
        event.preventDefault();
        step(-1);
      }
    }

    indexRef.current = applyIndex(0);
    const settleTimer = window.setTimeout(() => {
      indexRef.current = applyIndex(indexRef.current);
    }, prefersReducedMotion() ? 0 : 350);

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("keydown", onKeyDown);

    function onPanelStepRequest(event: Event) {
      const direction = (event as CustomEvent<{ direction?: 1 | -1 }>).detail
        ?.direction;
      step(direction === -1 ? -1 : 1);
    }
    window.addEventListener("roru:home-panel-step", onPanelStepRequest as EventListener);

    function onScrollToTop() {
      lockedRef.current = false;
      indexRef.current = applyIndex(0);
    }
    window.addEventListener(SCROLL_TO_TOP_EVENT, onScrollToTop);

    return () => {
      window.clearTimeout(settleTimer);
      document.documentElement.classList.remove("roru-home-footer-active");
      document.documentElement.style.removeProperty("--roru-home-active-index");
      clearNavTone();
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("roru:home-panel-step", onPanelStepRequest as EventListener);
      window.removeEventListener(SCROLL_TO_TOP_EVENT, onScrollToTop);
    };
  }, []);

  return null;
}
