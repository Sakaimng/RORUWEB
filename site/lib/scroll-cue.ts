const SCROLL_TOP_THRESHOLD_PX = 48;

function activeOverlayPanel(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".roru-home-overlay-panel.is-active");
}

function activeOverlayPanelIndex(): number {
  const active = activeOverlayPanel();
  if (!active) return 0;
  const panels = document.querySelectorAll<HTMLElement>(".roru-home-overlay-panel");
  const index = Array.from(panels).indexOf(active);
  return index < 0 ? 0 : index;
}

/** Whether the scroll cue should be visible for the current page + scroll state. */
export function shouldShowScrollCue(): boolean {
  if (typeof document === "undefined") return false;

  const html = document.documentElement;
  if (html.classList.contains("roru-preload") || html.classList.contains("roru-loading")) {
    return false;
  }
  if (html.classList.contains("roru-home-footer-active")) {
    return false;
  }

  const homeOverlays = document.querySelector(".roru-home-overlays");
  if (homeOverlays) {
    const active = activeOverlayPanel();
    if (!active) return true;
    if (active.classList.contains("roru-home-overlay-panel--footer")) return false;
    if (
      active.classList.contains("roru-home-overlay-panel--fill") ||
      active.querySelector(".roru-reserve-page")
    ) {
      return false;
    }

    if (active.classList.contains("roru-home-overlay-panel--about")) {
      return (html.dataset.aboutSection ?? "0") === "0";
    }

    if (
      active.classList.contains("roru-home-overlay-panel--scrollable") &&
      active.scrollTop > SCROLL_TOP_THRESHOLD_PX
    ) {
      return false;
    }

    return activeOverlayPanelIndex() === 0;
  }

  const scrollRoot = document.scrollingElement ?? document.documentElement;
  return scrollRoot.scrollTop <= SCROLL_TOP_THRESHOLD_PX;
}
