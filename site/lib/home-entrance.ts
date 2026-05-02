import gsap from "gsap";
import { INTERNAL_NAV_KEY, SITE_ENTERED_KEY } from "@/lib/roru-session";

const navScrollAttached = new WeakSet<HTMLElement>();

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

/**
 * Reveals `.homepage-reveal` blocks, syncs nav, dispatches `roru:hero-animate`.
 * Used after the intro loader and after client-side navigation back to `/`.
 */
export function runPostLoaderSequence(shouldAnimateNav: boolean, instantHeroStart: boolean) {
  /* Nav is not included: it has its own entrance in `shouldAnimateNav`; excluding avoids replay on client navigations. */
  const revealItems = document.querySelectorAll(".homepage-reveal:not(#roru-nav)");
  const nav = document.getElementById("roru-nav");
  const navBottom = document.getElementById("roru-nav-bottom");

  revealItems.forEach((el) => {
    el.classList.remove("homepage-reveal--settled");
  });
  gsap.set(revealItems, { opacity: 0, y: 24 });

  const tl = gsap.timeline();

  tl.add(() => {
    window.dispatchEvent(
      new CustomEvent("roru:hero-animate", {
        detail: { instant: instantHeroStart },
      })
    );
  }, 0);

  if (nav) {
    if (shouldAnimateNav) {
      gsap.set(nav, {
        autoAlpha: 0,
        y: -12,
        pointerEvents: "none",
      });
    } else {
      gsap.set(nav, {
        autoAlpha: 1,
        y: 0,
        pointerEvents: "auto",
        clearProps: "transform",
      });
    }
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
      tl.to(
        nav,
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.45,
          ease: "power3.out",
          onStart: () => {
            nav.style.pointerEvents = "auto";
          },
          onComplete: () => {
            gsap.set(nav, { clearProps: "transform" });
            setupNavScrollLogic(nav);
          },
        },
        "-=0.2"
      );
      if (navBottom) {
        tl.to(
          navBottom,
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.45,
            ease: "power3.out",
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
