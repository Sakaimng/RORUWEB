"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";
import { afterReactHydration } from "@/lib/after-react-hydration";
import { PATH_LINE_BOTTOM, PATH_LINE_TOP } from "@/lib/footer-logo-paths";
import { runPostLoaderSequence, setupNavScrollLogic, applyNavEntranceInitial } from "@/lib/home-entrance";
import { isMenuPath } from "@/lib/roru-path";
import { INTERNAL_NAV_KEY, SITE_ENTERED_KEY, TRANSITION_PENDING_KEY } from "@/lib/roru-session";

function getNavigationType(): string {
  if (typeof performance === "undefined") return "navigate";
  const navEntry = performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  if (navEntry?.type) return navEntry.type;
  const legacy = performance as Performance & { navigation?: { type: number } };
  if (legacy.navigation) {
    switch (legacy.navigation.type) {
      case 1:
        return "reload";
      case 2:
        return "back_forward";
      default:
        return "navigate";
    }
  }
  return "navigate";
}

function revealWithoutLoader(shouldAnimateNav: boolean) {
  const loader = document.getElementById("roru-loader");
  document.documentElement.classList.remove("roru-preload");
  document.documentElement.classList.remove("roru-loading");
  document.body.classList.remove("roru-loading");

  if (loader) loader.remove();

  try {
    if (sessionStorage.getItem(TRANSITION_PENDING_KEY) !== "1") {
      runPostLoaderSequence(shouldAnimateNav, false);
    }
  } catch {
    runPostLoaderSequence(shouldAnimateNav, false);
  }
}

function LoaderLogoSvg() {
  return (
    <svg
      id="roru-loader-logo"
      viewBox="0 0 267 136"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="RORUBARU"
    >
      <g id="roru-loader-strokes">
        <g id="roru-loader-line-top">
          {PATH_LINE_TOP.map((d, i) => (
            <path key={`st-${i}`} className="roru-loader-logo__stroke" d={d} />
          ))}
        </g>
        <g id="roru-loader-line-bottom">
          {PATH_LINE_BOTTOM.map((d, i) => (
            <path key={`sb-${i}`} className="roru-loader-logo__stroke" d={d} />
          ))}
        </g>
      </g>
    </svg>
  );
}

export function RoruLoader() {
  const innerRef = useRef<HTMLDivElement>(null);
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;

    let cancelled = false;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.documentElement.classList.remove("roru-preload");
      document.querySelectorAll(".homepage-reveal:not(#roru-nav)").forEach((el) => {
        el.classList.add("homepage-reveal--settled");
      });
      document.querySelectorAll(".roru-hero__title, .roru-hero__text").forEach((el) => {
        (el as HTMLElement).style.visibility = "visible";
      });
      const nav = document.getElementById("roru-nav");
      const navBottom = document.getElementById("roru-nav-bottom");
      if (nav) {
        applyNavEntranceInitial(nav, false);
        setupNavScrollLogic(nav);
      }
      if (navBottom) {
        gsap.set(navBottom, {
          autoAlpha: 1,
          y: 0,
          clearProps: "transform",
        });
      }
      try {
        sessionStorage.setItem(SITE_ENTERED_KEY, "1");
        sessionStorage.removeItem(INTERNAL_NAV_KEY);
      } catch {
        /* ignore */
      }
      const loader = document.getElementById("roru-loader");
      if (loader) loader.remove();
      return;
    }

    const hasEnteredSite = sessionStorage.getItem(SITE_ENTERED_KEY) === "1";
    const isInternalNavigation = sessionStorage.getItem(INTERNAL_NAV_KEY) === "1";
    const isReload = getNavigationType() === "reload";
    const skipLoaderOnReload = isReload && isMenuPath();

    const shouldRunLoader =
      !isInternalNavigation && !skipLoaderOnReload && (!hasEnteredSite || isReload);
    const shouldAnimateNav = !isInternalNavigation && (!hasEnteredSite || isReload);

    if (!shouldRunLoader) {
      afterReactHydration(() => {
        if (cancelled || ranRef.current) return;
        revealWithoutLoader(shouldAnimateNav);
        ranRef.current = true;
      });
      return () => {
        cancelled = true;
      };
    }

    afterReactHydration(() => {
      if (cancelled || ranRef.current) return;

      const wrap = innerRef.current;
      const loader = document.getElementById("roru-loader");
      const loaderSvg = document.getElementById("roru-loader-logo");
      if (!wrap) {
        revealWithoutLoader(shouldAnimateNav);
        ranRef.current = true;
        return;
      }
      const strokeRoot = wrap.querySelector("#roru-loader-strokes");
      const topStrokes = gsap.utils.toArray<SVGPathElement>(
        "#roru-loader-line-top .roru-loader-logo__stroke",
        wrap
      );
      const bottomStrokes = gsap.utils.toArray<SVGPathElement>(
        "#roru-loader-line-bottom .roru-loader-logo__stroke",
        wrap
      );
      const nav = document.getElementById("roru-nav");
      const navBottom = document.getElementById("roru-nav-bottom");
      const strokePaths = [...topStrokes, ...bottomStrokes];

      if (
        !loader ||
        !loaderSvg ||
        !strokeRoot ||
        !topStrokes.length ||
        !bottomStrokes.length
      ) {
        revealWithoutLoader(shouldAnimateNav);
        ranRef.current = true;
        return;
      }

      document.documentElement.classList.add("roru-loading");
      document.body.classList.add("roru-loading");

      strokePaths.forEach((path) => {
        const len = path.getTotalLength();
        gsap.set(path, {
          strokeDasharray: len,
          strokeDashoffset: len,
          fillOpacity: 0,
          strokeOpacity: 1,
        });
      });
      gsap.set(wrap, {
        scale: 0.94,
        transformOrigin: "50% 50%",
      });
      gsap.set(loaderSvg, { autoAlpha: 0 });

      if (nav) {
        applyNavEntranceInitial(nav, true);
      }
      if (navBottom) {
        gsap.set(navBottom, {
          autoAlpha: 0,
          y: 12,
        });
      }

      requestAnimationFrame(() => {
        if (cancelled) return;
        const logoWrap = innerRef.current;
        const loaderEl = document.getElementById("roru-loader");
        if (!logoWrap || !loaderEl) {
          revealWithoutLoader(true);
          ranRef.current = true;
          return;
        }

        document.documentElement.classList.remove("roru-preload");

        const tl = gsap.timeline();

        tl.to(loaderSvg, {
          autoAlpha: 1,
          duration: 0.48,
          ease: "power2.out",
        })
          .to(
            topStrokes,
            {
              strokeDashoffset: 0,
              duration: 0.74,
              stagger: 0.058,
              ease: "power2.inOut",
            },
            ">"
          )
          .to(
            bottomStrokes,
            {
              strokeDashoffset: 0,
              duration: 0.74,
              stagger: 0.058,
              ease: "power2.inOut",
            },
            "<0.09"
          )
          .to(
            strokePaths,
            {
              strokeOpacity: 0,
              fillOpacity: 1,
              duration: 0.42,
              ease: "power2.inOut",
              onStart: () => {
                strokePaths.forEach((path) => path.classList.add("is-filled"));
              },
            },
            ">-0.06"
          )
          .to(
            logoWrap,
            {
              scale: 1,
              duration: 0.58,
              ease: "expo.out",
            },
            "<0.04"
          )
          .set(loaderEl, {
            clipPath: "inset(0% 0% 0% 0%)",
            pointerEvents: "none",
          })
          .to(
            loaderEl,
            {
              clipPath: "inset(0% 0% 100% 0%)",
              duration: 0.82,
              ease: "power3.inOut",
            },
            "+=0.12"
          )
          .add(() => {
            loaderEl.remove();
            document.documentElement.classList.remove("roru-loading");
            document.body.classList.remove("roru-loading");
            runPostLoaderSequence(true, true);
          });

        ranRef.current = true;
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div id="roru-loader" aria-hidden="true">
      <div className="roru-loader__inner">
        <div className="roru-loader__logo-wrap" ref={innerRef}>
          <LoaderLogoSvg />
        </div>
      </div>
    </div>
  );
}
