"use client";

import gsap from "gsap";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { runPostLoaderSequence } from "@/lib/home-entrance";
import { isHomePathname } from "@/lib/roru-path";
import {
  INTERNAL_NAV_KEY,
  PAGE_TRANSITION_START_EVENT,
  TRANSITION_PENDING_KEY,
} from "@/lib/roru-session";

const FADE_OUT_DURATION = 0.32;
const FADE_IN_DURATION = 0.38;

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

function revealPageContent() {
  document.querySelectorAll("body > *:not(#roru-page-transition)").forEach((el) => {
    (el as HTMLElement).style.removeProperty("visibility");
  });
}

export function PageTransition() {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const overlayRef = useRef<HTMLDivElement>(null);
  const isTransitioning = useRef(false);
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  useEffect(() => {
    isTransitioning.current = false;
  }, [pathname]);

  useEffect(() => {
    if (!overlayRef.current) return;

    function showOverlay() {
      overlayRef.current!.classList.add("is-active");
    }

    function hideOverlay() {
      const el = overlayRef.current;
      if (!el) return;
      el.classList.remove("is-active");
      document.documentElement.classList.remove("roru-transition-pending");
      gsap.set(el, { opacity: 0 });
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
      window.dispatchEvent(new CustomEvent(PAGE_TRANSITION_START_EVENT));
      showOverlay();
      gsap.fromTo(
        el,
        { opacity: 0 },
        {
          opacity: 1,
          duration: FADE_OUT_DURATION,
          ease: "power2.inOut",
          onComplete: () => {
            try {
              sessionStorage.setItem(TRANSITION_PENDING_KEY, "1");
              sessionStorage.setItem(INTERNAL_NAV_KEY, "1");
            } catch {
              /* ignore */
            }
            router.push(href);
          },
        },
      );
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

    document.addEventListener("click", onClick, true);

    return () => {
      document.removeEventListener("click", onClick, true);
    };
  }, [router]);

  useEffect(() => {
    let pending = false;
    try {
      pending = sessionStorage.getItem(TRANSITION_PENDING_KEY) === "1";
    } catch {
      return;
    }
    if (!pending) return;

    const overlay = overlayRef.current;
    if (!overlay) return;

    gsap.set(overlay, { opacity: 1 });
    overlay.classList.add("is-active");

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
        overlay.classList.remove("is-active");
        document.documentElement.classList.remove("roru-transition-pending");
        isTransitioning.current = false;
        try {
          sessionStorage.removeItem(TRANSITION_PENDING_KEY);
        } catch {
          /* ignore */
        }
      },
    });

    return () => {
      tween.kill();
    };
  }, [pathname]);

  return (
    <div
      className="roru-page-transition"
      id="roru-page-transition"
      aria-hidden="true"
      ref={overlayRef}
    />
  );
}
