/** Nav foreground on photographic cover panels vs light gray content sections. */
export const NAV_TONE_LIGHT_CLASS = "roru-nav-tone-light";

export function isCoverPanel(panel: HTMLElement | null | undefined): boolean {
  if (!panel) return false;
  if (panel.classList.contains("roru-home-overlay-panel--hero")) return true;
  return panel.querySelector(".roru-gallery-section--featured") != null;
}

export function syncNavToneFromPanel(panel: HTMLElement | null | undefined) {
  if (typeof document === "undefined") return;
  if (panel?.classList.contains("roru-home-overlay-panel--about")) return;
  document.documentElement.classList.toggle(NAV_TONE_LIGHT_CLASS, isCoverPanel(panel));
}

export function syncNavToneForAboutSection(_section: 0 | 1 | 2) {
  if (typeof document === "undefined") return;
  // About sits on a light surface in every scene — keep nav/cue in the dark-on-light tone.
  document.documentElement.classList.remove(NAV_TONE_LIGHT_CLASS);
}

export function clearNavTone() {
  if (typeof document === "undefined") return;
  document.documentElement.classList.remove(NAV_TONE_LIGHT_CLASS);
}
