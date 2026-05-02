"use client";

import gsap from "gsap";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { HongKongClock } from "./ThemeAndClock";
import { SITE_ADDRESS_DOCK_LINE, SITE_MAP_URL, TOCK_URL } from "@/lib/content";
import { PAGE_TRANSITION_START_EVENT } from "@/lib/roru-session";

function scrambleLabel(el: HTMLElement, original: string) {
  const chars = "XO01";
  const len = original.length;
  const state = { t: 0 };
  return gsap.to(state, {
    t: 1,
    duration: 0.42,
    ease: "none",
    onUpdate: () => {
      const t = state.t;
      let out = "";
      for (let i = 0; i < len; i++) {
        out += t > 0.85 ? original[i]! : chars[Math.floor(Math.random() * chars.length)]!;
      }
      el.textContent = out;
    },
  });
}

export function Navigation() {
  const pathname = usePathname();
  const menuWrapRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  /** Skip closing on first mount; then close flyout on real client navigations (mobile). */
  const prevPathnameForMenuRef = useRef<string | null>(null);

  useEffect(() => {
    const navTextTargets = [
      ...document.querySelectorAll<HTMLElement>(".roru-nav__pill"),
      ...document.querySelectorAll<HTMLElement>(".roru-nav__menu-button"),
    ];

    const cleanups: Array<() => void> = [];

    navTextTargets.forEach((el) => {
      const label = el.querySelector<HTMLElement>(".roru-nav__label");
      if (!label) return;

      const originalText = label.textContent?.trim() ?? "";
      if (!originalText) return;

      el.setAttribute("data-text", originalText);

      const measuredWidth = label.getBoundingClientRect().width;
      label.style.width = `${measuredWidth}px`;

      let hoverTween: gsap.core.Tween | null = null;

      const onEnter = () => {
        el.classList.add("is-hovered");
        hoverTween?.kill();
        hoverTween = scrambleLabel(label, originalText);
      };

      const onLeave = () => {
        el.classList.remove("is-hovered");
        hoverTween?.kill();
        label.textContent = originalText;
      };

      el.addEventListener("mouseenter", onEnter);
      el.addEventListener("mouseleave", onLeave);
      cleanups.push(() => {
        el.removeEventListener("mouseenter", onEnter);
        el.removeEventListener("mouseleave", onLeave);
        hoverTween?.kill();
      });
    });

    return () => cleanups.forEach((fn) => fn());
  }, [pathname]);

  useEffect(() => {
    const wrapMaybe = menuWrapRef.current;
    const btnMaybe = menuButtonRef.current;
    if (!wrapMaybe || !btnMaybe) return;

    const wrap = wrapMaybe;
    const btn = btnMaybe;

    const menuItems = gsap.utils.toArray<HTMLElement>("#roru-menu-items .roru-nav__pill");
    if (!menuItems.length) return;

    const mq = window.matchMedia("(min-width: 768px)");

    function openMenu() {
      wrap.classList.add("is-open");
      btn.setAttribute("aria-expanded", "true");
      gsap.killTweensOf(menuItems);
      gsap.fromTo(
        menuItems,
        {
          opacity: 0,
          x: window.innerWidth <= 767 ? 0 : 12,
          y: window.innerWidth <= 767 ? -8 : 0,
        },
        {
          opacity: 1,
          x: 0,
          y: 0,
          duration: 0.42,
          ease: "power3.out",
          stagger: 0.05,
        }
      );
    }

    function closeMenu() {
      btn.setAttribute("aria-expanded", "false");
      gsap.killTweensOf(menuItems);
      gsap.to(menuItems, {
        opacity: 0,
        x: window.innerWidth <= 767 ? 0 : 8,
        y: window.innerWidth <= 767 ? -6 : 0,
        duration: 0.2,
        ease: "power2.in",
        stagger: { each: 0.03, from: "end" },
        onComplete: () => {
          wrap.classList.remove("is-open");
        },
      });
    }

    function setMenu(next: boolean) {
      const isOpen = wrap.classList.contains("is-open");
      if (next === isOpen) return;
      if (next) openMenu();
      else closeMenu();
    }

    function onMenuClick() {
      setMenu(!wrap.classList.contains("is-open"));
    }

    function onDocClick(e: MouseEvent) {
      if (!wrap.contains(e.target as Node)) {
        setMenu(false);
      }
    }

    function onResize() {
      if (mq.matches) return;
      if (!wrap.classList.contains("is-open")) {
        gsap.set(menuItems, {
          opacity: 0,
          x: window.innerWidth <= 767 ? 0 : 12,
          y: window.innerWidth <= 767 ? -8 : 0,
        });
      }
    }

    function unbindMobile() {
      btn.removeEventListener("click", onMenuClick);
      document.removeEventListener("click", onDocClick);
      window.removeEventListener("resize", onResize);
    }

    function bindMobile() {
      btn.addEventListener("click", onMenuClick);
      document.addEventListener("click", onDocClick);
      window.addEventListener("resize", onResize);
    }

    function applyForMode() {
      unbindMobile();
      if (mq.matches) {
        wrap.classList.remove("is-open");
        btn.setAttribute("aria-expanded", "false");
        gsap.killTweensOf(menuItems);
        gsap.set(menuItems, { opacity: 1, x: 0, y: 0 });
      } else {
        bindMobile();
        if (!wrap.classList.contains("is-open")) {
          gsap.set(menuItems, {
            opacity: 0,
            x: window.innerWidth <= 767 ? 0 : 12,
            y: window.innerWidth <= 767 ? -8 : 0,
          });
        }
      }
    }

    mq.addEventListener("change", applyForMode);
    applyForMode();

    function onScrollCloseMenu() {
      if (mq.matches) return;
      if (!wrap.classList.contains("is-open")) return;
      closeMenu();
    }
    window.addEventListener("scroll", onScrollCloseMenu, { passive: true });

    function onPageTransitionStart() {
      if (mq.matches) return;
      if (!wrap.classList.contains("is-open")) return;
      closeMenu();
    }
    window.addEventListener(PAGE_TRANSITION_START_EVENT, onPageTransitionStart);

    if (!mq.matches) {
      const prev = prevPathnameForMenuRef.current;
      if (prev !== null && prev !== pathname && wrap.classList.contains("is-open")) {
        closeMenu();
      }
      prevPathnameForMenuRef.current = pathname;
    } else {
      prevPathnameForMenuRef.current = pathname;
    }

    return () => {
      window.removeEventListener("scroll", onScrollCloseMenu);
      window.removeEventListener(PAGE_TRANSITION_START_EVENT, onPageTransitionStart);
      mq.removeEventListener("change", applyForMode);
      unbindMobile();
    };
  }, [pathname]);

  return (
    <>
      <nav className="roru-nav" id="roru-nav" aria-label="Main">
        <div className="roru-nav__left">
          <div className="roru-nav__pill roru-nav__accent-pill roru-nav__pill--plain max-w-full min-w-0">
            <HongKongClock />
          </div>
        </div>

        <div className="roru-nav__right">
          <div className="roru-nav__menu-wrap" id="roru-menu-wrap" ref={menuWrapRef}>
            <div className="roru-nav__menu-items" id="roru-menu-items">
              <Link
                href="/"
                className="roru-nav__pill"
                aria-current={pathname === "/" ? "page" : undefined}
              >
                <span className="roru-nav__label">Home</span>
              </Link>
              <Link
                href="/about"
                className="roru-nav__pill"
                aria-current={pathname === "/about" ? "page" : undefined}
              >
                <span className="roru-nav__label">About</span>
              </Link>
            </div>

            <button
              type="button"
              className="roru-nav__menu-button"
              id="roru-menu-button"
              aria-expanded="false"
              aria-controls="roru-menu-items"
              ref={menuButtonRef}
            >
              <span className="roru-nav__label">Menu</span>
            </button>

            <a
              href={TOCK_URL}
              className="roru-nav__pill max-md:hidden"
              target="_blank"
              rel="noreferrer"
            >
              <span className="roru-nav__label">Reserve now</span>
            </a>
          </div>
        </div>
      </nav>

      <div
        className="roru-nav-bottom"
        id="roru-nav-bottom"
        role="complementary"
        aria-label="Location, brand, and reservation"
      >
        <a
          className="roru-nav__pill roru-nav__accent-pill roru-nav__pill--plain roru-nav-bottom__address hidden md:inline-flex"
          href={SITE_MAP_URL}
          target="_blank"
          rel="noreferrer"
          title={SITE_ADDRESS_DOCK_LINE}
        >
          <span className="block min-w-0 max-w-[min(90vw,640px)] overflow-hidden text-ellipsis whitespace-nowrap text-left text-[9px] sm:text-[10px]">
            {SITE_ADDRESS_DOCK_LINE}
          </span>
        </a>
        <div
          className="roru-nav__pill roru-nav__accent-pill roru-nav__pill--plain roru-nav-bottom__brand normal-case hidden md:flex"
          aria-label="RORUBARU"
        >
          <span className="whitespace-nowrap text-[10px] tracking-[0.14em] sm:text-[11px]">
            RORUBARU
          </span>
        </div>
        <a
          href={TOCK_URL}
          className="roru-nav__pill roru-nav-bottom__reserve flex md:hidden"
          target="_blank"
          rel="noreferrer"
          aria-label="Reserve a table"
        >
          <span className="roru-nav__label">Reserve now</span>
        </a>
      </div>
    </>
  );
}
