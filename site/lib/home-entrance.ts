import gsap from "gsap";
import { afterReactHydration } from "@/lib/after-react-hydration";
import { isHomePathname } from "@/lib/roru-path";
import { INTERNAL_NAV_KEY, SITE_ENTERED_KEY } from "@/lib/roru-session";

const navScrollAttached = new WeakSet<HTMLElement>();

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function queryNavEntranceItems(nav: HTMLElement | null): HTMLElement[] {
  if (!nav) return [];
  return Array.from(nav.querySelectorAll<HTMLElement>(".roru-nav-item")).filter(
    (el) => el.offsetParent !== null
  );
}

/** Hide nav items before the staggered fade-in; show immediately when not animating. */
export function applyNavEntranceInitial(nav: HTMLElement | null, animate: boolean) {
  const items = queryNavEntranceItems(nav);
  if (!nav) return;

  if (animate) {
    gsap.set(nav, { autoAlpha: 1, y: 0, pointerEvents: "none" });
    gsap.set(items, { autoAlpha: 0 });
    return;
  }

  gsap.set(nav, {
    autoAlpha: 1,
    y: 0,
    pointerEvents: "auto",
    clearProps: "transform",
  });
  gsap.set(items, { autoAlpha: 1, clearProps: "all" });
}

/** Staggered fade-in for each `.roru-nav-item`. */
export function navEntranceTween(nav: HTMLElement | null) {
  const items = queryNavEntranceItems(nav);
  if (!nav || items.length === 0) {
    return gsap.timeline();
  }

  return gsap.timeline().to(items, {
    autoAlpha: 1,
    duration: 0.38,
    stagger: 0.065,
    ease: "power2.out",
    onStart: () => {
      nav.style.pointerEvents = "auto";
    },
    onComplete: () => {
      gsap.set(items, { clearProps: "all" });
    },
  });
}

/**
 * Pixels: treat the fixed footer as “in view” when the bottom of `#page-content` rises above
 * `window.innerHeight - FOOTER_SCROLL_REVEAL_PX` — same threshold as nav/dock hide.
 */
export const FOOTER_SCROLL_REVEAL_PX = 2;

/** True when main content has scrolled up enough that the fixed footer fills the viewport (nav uses this). */
export function isMainPastFooterReveal(main: HTMLElement | null): boolean {
  if (!main) return false;
  const mainBottom = main.getBoundingClientRect().bottom;
  return mainBottom < window.innerHeight - FOOTER_SCROLL_REVEAL_PX;
}

/** Hide-on-scroll for top nav + bottom dock when the footer region nears the viewport. */
export function setupNavScrollLogic(nav: HTMLElement | null) {
  if (!nav || navScrollAttached.has(nav)) return;
  navScrollAttached.add(nav);

  const navEl: HTMLElement = nav;
  const dockEl = document.getElementById("roru-nav-bottom");
  let ticking = false;

  function setDockHidden(hidden: boolean) {
    dockEl?.classList.toggle("is-hidden", hidden);
  }

  function updateNav() {
    const main = document.getElementById("page-content");
    if (!main) {
      ticking = false;
      return;
    }
    const footerSeen = isMainPastFooterReveal(main);

    if (footerSeen) {
      navEl.classList.add("is-hidden");
      setDockHidden(true);
    } else {
      navEl.classList.remove("is-hidden");
      setDockHidden(false);
    }

    ticking = false;
  }

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        requestAnimationFrame(updateNav);
        ticking = true;
      }
    },
    { passive: true }
  );

  window.addEventListener("resize", updateNav);
  updateNav();
}

/** Dynamic home sections must be in the DOM before GSAP touches `.homepage-reveal` wrappers. */
const HOME_REVEAL_SECTION_SELECTORS = [
  "#roru-booking-section",
  ".roru-events-section",
  "#inquiry",
] as const;

const HOME_REVEAL_WAIT_MS = 4000;

function whenHomeRevealTargetsReady(cb: () => void) {
  if (typeof window === "undefined") return;

  if (!isHomePathname()) {
    afterReactHydration(cb);
    return;
  }

  const start = performance.now();

  function targetsReady() {
    return HOME_REVEAL_SECTION_SELECTORS.every((sel) => document.querySelector(sel));
  }

  function finish() {
    afterReactHydration(cb);
  }

  function tick() {
    if (targetsReady()) {
      finish();
      return;
    }
    if (performance.now() - start >= HOME_REVEAL_WAIT_MS) {
      finish();
      return;
    }
    requestAnimationFrame(tick);
  }

  tick();
}

/**
 * Reveals `.homepage-reveal` blocks, syncs nav, dispatches `roru:hero-animate`.
 * Used after the intro loader and after client-side navigation back to `/`.
 */
export function runPostLoaderSequence(shouldAnimateNav: boolean, instantHeroStart: boolean) {
  if (isHomePathname()) {
    afterReactHydration(() => {
      runPostLoaderSequenceImpl(shouldAnimateNav, instantHeroStart);
    });
    return;
  }

  whenHomeRevealTargetsReady(() => {
    runPostLoaderSequenceImpl(shouldAnimateNav, instantHeroStart);
  });
}

function runPostLoaderSequenceImpl(shouldAnimateNav: boolean, instantHeroStart: boolean) {
  /*
   * Overlay panels own their transform through HomeYslScroll. Never include
   * them in this GSAP entrance tween: `y: 0` would overwrite their stacked
   * translateY state and briefly expose every panel.
   */
  const revealItems = document.querySelectorAll(
    ".homepage-reveal:not(#roru-nav):not(.roru-home-overlay-panel)",
  );
  const nav = document.getElementById("roru-nav");
  const navBottom = document.getElementById("roru-nav-bottom");
  const reducedMotion = prefersReducedMotion();

  if (reducedMotion) {
    window.dispatchEvent(
      new CustomEvent("roru:hero-animate", {
        detail: { instant: true },
      })
    );
    revealItems.forEach((el) => {
      el.classList.add("homepage-reveal--settled");
    });
    applyNavEntranceInitial(nav, false);
    if (navBottom) {
      gsap.set(navBottom, {
        autoAlpha: 1,
        y: 0,
        clearProps: "transform",
      });
    }
    if (nav) setupNavScrollLogic(nav);
    try {
      sessionStorage.setItem(SITE_ENTERED_KEY, "1");
      sessionStorage.removeItem(INTERNAL_NAV_KEY);
    } catch {
      /* ignore */
    }
    return;
  }

  revealItems.forEach((el) => {
    el.classList.remove("homepage-reveal--settled");
  });
  /* Initial hidden state comes from `.homepage-reveal` CSS — avoid gsap.set inline styles before hydration. */

  const tl = gsap.timeline();

  tl.add(() => {
    window.dispatchEvent(
      new CustomEvent("roru:hero-animate", {
        detail: { instant: instantHeroStart },
      })
    );
  }, 0);

  if (nav) {
    applyNavEntranceInitial(nav, shouldAnimateNav);
  }

  if (navBottom) {
    if (shouldAnimateNav) {
      gsap.set(navBottom, {
        autoAlpha: 0,
        y: 12,
      });
    } else {
      gsap.set(navBottom, {
        autoAlpha: 1,
        y: 0,
        clearProps: "transform",
      });
    }
  }

  tl.to(
    revealItems,
    {
      opacity: 1,
      y: 0,
      duration: 0.36,
      stagger: 0.04,
      ease: "power3.out",
      onComplete: () => {
        revealItems.forEach((el) => {
          el.classList.add("homepage-reveal--settled");
        });
        gsap.set(revealItems, { clearProps: "all" });
        try {
          sessionStorage.setItem(SITE_ENTERED_KEY, "1");
          sessionStorage.removeItem(INTERNAL_NAV_KEY);
        } catch {
          /* ignore */
        }
      },
    },
    0
  );

  if (nav) {
    if (shouldAnimateNav) {
      tl.add(navEntranceTween(nav), "-=0.15");
      tl.add(() => setupNavScrollLogic(nav));
      if (navBottom) {
        tl.to(
          navBottom,
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.38,
            ease: "power2.out",
            onComplete: () => {
              gsap.set(navBottom, { clearProps: "transform" });
            },
          },
          "<"
        );
      }
    } else {
      tl.add(() => {
        setupNavScrollLogic(nav);
      }, 0);
    }
  } else {
    tl.add(() => {}, 0);
  }
}
