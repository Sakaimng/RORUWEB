const SCROLL_TOP_THRESHOLD_PX = 48;

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
    const active = document.querySelector<HTMLElement>(".roru-home-overlay-panel.is-active");
    if (!active) return true;
    if (active.classList.contains("roru-home-overlay-panel--footer")) return false;
    if (
      active.classList.contains("roru-home-overlay-panel--fill") ||
      active.querySelector(".roru-reserve-page")
    ) {
      return false;
    }
    if (
      active.classList.contains("roru-home-overlay-panel--scrollable") &&
      active.scrollTop > SCROLL_TOP_THRESHOLD_PX
    ) {
      return false;
    }
    return true;
  }

  const scrollRoot = document.scrollingElement ?? document.documentElement;
  return scrollRoot.scrollTop <= SCROLL_TOP_THRESHOLD_PX;
}
