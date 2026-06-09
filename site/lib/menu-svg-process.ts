/** Menu page layout helpers for responsive SVG boards. */

export const MENU_MOBILE_MAX_WIDTH = 767;

export function isMenuMobileLayout(): boolean {
  return window.matchMedia(`(max-width: ${MENU_MOBILE_MAX_WIDTH}px)`).matches;
}
