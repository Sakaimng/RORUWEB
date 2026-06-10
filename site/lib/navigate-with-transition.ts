/** Programmatic in-app navigation that uses the PageTransition fade overlay. */
export const NAVIGATE_WITH_TRANSITION_EVENT = "roru:navigate-with-transition";

export function revealPageContent(): void {
  if (typeof document === "undefined") return;
  document.querySelectorAll("body > *:not(#roru-page-transition)").forEach((el) => {
    (el as HTMLElement).style.removeProperty("visibility");
  });
}

export function navigateWithTransition(href: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(NAVIGATE_WITH_TRANSITION_EVENT, { detail: { href } }),
  );
}
