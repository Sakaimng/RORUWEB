"use client";

import gsap from "gsap";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { runPostLoaderSequence } from "@/lib/home-entrance";
import {
  NAVIGATE_WITH_TRANSITION_EVENT,
  revealPageContent,
} from "@/lib/navigate-with-transition";
import { isHomePathname } from "@/lib/roru-path";
import {
  INTERNAL_NAV_KEY,
  PAGE_TRANSITION_START_EVENT,
  TRANSITION_PENDING_KEY,
} from "@/lib/roru-session";

const FADE_OUT_DURATION = 0.32;
const FADE_IN_DURATION = 0.38;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function normalizePathname(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  const noTrail = pathname.replace(/\/+$/, "");
  return noTrail === "" ? "/" : noTrail;
}

function isSameAppPath(
  targetUrl: URL,
  currentPathnameFromRouter: string,
  loc: typeof window.location,
): boolean {
  if (targetUrl.origin !== loc.origin) return false;
  const next = normalizePathname(targetUrl.pathname);
  const cur = normalizePathname(currentPathnameFromRouter || loc.pathname);
  return next === cur;
}

export function PageTransition() {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const overlayRef = useRef<HTMLDivElement>(null);
  const isTransitioning = useRef(false);
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const releaseTransitionLock = useCallback(
    (overlay = overlayRef.current) => {
      overlay?.classList.remove("is-active");
      if (overlay) {
        gsap.set(overlay, { opacity: 0 });
      }

      document.documentElement.classList.remove("roru-transition-pending");
      isTransitioning.current = false;

      try {
        sessionStorage.removeItem(TRANSITION_PENDING_KEY);
      } catch {
        /* ignore */
      }
    },
    [],
  );

  useEffect(() => {
    isTransitioning.current = false;
  }, [pathname]);

  useEffect(() => {
    if (!overlayRef.current) return;

    function showOverlay() {
      overlayRef.current!.classList.add("is-active");
    }

    function hideOverlay() {
      releaseTransitionLock();
    }

    function transitionIn(href: string) {
      const el = overlayRef.current;
      if (!el) return;
      try {
        const dest = new URL(href, window.location.origin);
        if (isSameAppPath(dest, pathnameRef.current, window.location)) {
          return;
        }
      } catch {
        /* ignore */
      }
      if (isTransitioning.current) return;
      isTransitioning.current = true;
      showOverlay();

      const completeOutgoingTransition = () => {
        window.dispatchEvent(new CustomEvent(PAGE_TRANSITION_START_EVENT));
        try {
          sessionStorage.setItem(TRANSITION_PENDING_KEY, "1");
          sessionStorage.setItem(INTERNAL_NAV_KEY, "1");
        } catch {
          /* ignore */
        }
        router.push(href);
      };

      if (prefersReducedMotion()) {
        gsap.set(el, { opacity: 1 });
        completeOutgoingTransition();
        return;
      }

      gsap.fromTo(el, { opacity: 0 }, {
        opacity: 1,
        duration: FADE_OUT_DURATION,
        ease: "power2.inOut",
        onComplete: completeOutgoingTransition,
      });
    }

    try {
      if (sessionStorage.getItem(TRANSITION_PENDING_KEY) === "1") {
        document.documentElement.classList.add("roru-transition-pending");
        gsap.set(overlayRef.current, { opacity: 1 });
        showOverlay();
      } else {
        hideOverlay();
        revealPageContent();
      }
    } catch {
      hideOverlay();
      revealPageContent();
    }

    function onClick(e: MouseEvent) {
      const link = (e.target as Element | null)?.closest("a[href]");
      if (!link) return;
      const href = link.getAttribute("href");
      if (!href) return;
      if (
        link.getAttribute("target") === "_blank" ||
        link.hasAttribute("download") ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("javascript:")
      ) {
        return;
      }
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (isSameAppPath(url, pathnameRef.current, window.location)) return;
      if (isTransitioning.current) return;

      const nextLoc = `${url.pathname}${url.search}${url.hash}`;
      e.preventDefault();
      e.stopPropagation();
      transitionIn(nextLoc);
    }

    function onNavigateWithTransition(e: Event) {
      const href = (e as CustomEvent<{ href: string }>).detail?.href;
      if (!href) return;
      transitionIn(href);
    }

    document.addEventListener("click", onClick, true);
    window.addEventListener(NAVIGATE_WITH_TRANSITION_EVENT, onNavigateWithTransition);

    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener(NAVIGATE_WITH_TRANSITION_EVENT, onNavigateWithTransition);
    };
  }, [releaseTransitionLock, router]);

  useEffect(() => {
    let pending = false;
    try {
      pending = sessionStorage.getItem(TRANSITION_PENDING_KEY) === "1";
    } catch {
      releaseTransitionLock();
      return;
    }
    if (!pending) {
      releaseTransitionLock();
      return;
    }

    const overlay = overlayRef.current;
    if (!overlay) return;

    gsap.set(overlay, { opacity: 1 });
    overlay.classList.add("is-active");

    if (prefersReducedMotion()) {
      revealPageContent();
      runPostLoaderSequence(false, isHomePathname(pathname));
      releaseTransitionLock(overlay);
      return;
    }

    const tween = gsap.to(overlay, {
      opacity: 0,
      duration: FADE_IN_DURATION,
      ease: "power2.inOut",
      delay: 0.04,
      onStart: () => {
        revealPageContent();
        runPostLoaderSequence(false, isHomePathname(pathname));
      },
      onComplete: () => {
        releaseTransitionLock(overlay);
      },
    });

    return () => {
      tween.kill();
      /*
       * React replays effects in development, so only release when a real
       * pathname change interrupted this fade. Otherwise the replay would
       * cancel a valid incoming transition before it becomes visible.
       */
      if (pathnameRef.current !== pathname) {
        releaseTransitionLock(overlay);
      }
    };
  }, [pathname, releaseTransitionLock]);

  return (
    <div
      className="roru-page-transition"
      id="roru-page-transition"
      aria-hidden="true"
      ref={overlayRef}
    />
  );
}
