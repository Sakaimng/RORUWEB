export const SCROLL_TO_TOP_EVENT = "roru:scroll-to-top";

/** Scroll the current page to its top (overlay panel 0, inner scroll areas, then document). */
export function scrollPageToTop() {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new CustomEvent(SCROLL_TO_TOP_EVENT));

  document
    .querySelectorAll<HTMLElement>(".roru-home-overlay-panel--scrollable")
    .forEach((panel) => {
      panel.scrollTo({ top: 0, behavior: "smooth" });
    });

  window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  document.documentElement.scrollTo({ top: 0, behavior: "smooth" });
  document.body.scrollTo({ top: 0, behavior: "smooth" });
}
