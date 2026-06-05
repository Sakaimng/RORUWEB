/**
 * Defer imperative DOM changes (GSAP, etc.) until after React has hydrated.
 * `next/dynamic` and concurrent hydration can still be in progress when layout
 * `useEffect` runs; mutating those nodes first causes attribute mismatches.
 */
export function afterReactHydration(cb: () => void): void {
  if (typeof window === "undefined") return;
  queueMicrotask(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(cb);
    });
  });
}
