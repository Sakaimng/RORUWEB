"use client";

import gsap from "gsap";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { NavLogo } from "./NavLogo";
import { LanguageToggle } from "./LanguageToggle";
import { TOCK_URL } from "@/lib/content";
import { useI18n } from "@/lib/i18n";
import { PAGE_TRANSITION_START_EVENT } from "@/lib/roru-session";
import { scrollPageToTop } from "@/lib/scroll-to-top";

function isActiveRoute(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Crossfading MENU / CLOSE label for the mobile toggle (matches WSSC's swap animation). */
function MenuToggleLabel({ open }: { open: boolean }) {
  const menuRef = useRef<HTMLSpanElement>(null);
  const closeRef = useRef<HTMLSpanElement>(null);
  const openRef = useRef(open);
  const hasMountedRef = useRef(false);

  useLayoutEffect(() => {
    const menu = menuRef.current;
    const close = closeRef.current;
    if (!menu || !close) return;

    const showMenu = !open;

    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      openRef.current = open;
      gsap.set(menu, {
        autoAlpha: showMenu ? 1 : 0,
        y: 0,
        pointerEvents: showMenu ? "auto" : "none",
      });
      gsap.set(close, {
        autoAlpha: showMenu ? 0 : 1,
        y: 0,
        pointerEvents: showMenu ? "none" : "auto",
      });
      return;
    }

    if (openRef.current === open) return;
    openRef.current = open;

    const entering = showMenu ? menu : close;
    const exiting = showMenu ? close : menu;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      gsap.set(menu, {
        autoAlpha: showMenu ? 1 : 0,
        y: 0,
        pointerEvents: showMenu ? "auto" : "none",
      });
      gsap.set(close, {
        autoAlpha: showMenu ? 0 : 1,
        y: 0,
        pointerEvents: showMenu ? "none" : "auto",
      });
      return;
    }

    gsap.killTweensOf([menu, close]);

    gsap
      .timeline({ defaults: { ease: "power2.inOut" } })
      .to(exiting, { autoAlpha: 0, y: -7, duration: 0.14, ease: "power2.in" }, 0)
      .fromTo(
        entering,
        { autoAlpha: 0, y: 7 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.22,
          ease: "power3.out",
          pointerEvents: "auto",
        },
        0.06
      )
      .set(exiting, { pointerEvents: "none" }, 0);
  }, [open]);

  return (
    <span
      className="relative inline-block min-w-[2.85rem] overflow-hidden text-center leading-none"
      aria-hidden
    >
      <span ref={menuRef} className="absolute inset-0 flex items-center justify-center">
        Menu
      </span>
      <span ref={closeRef} className="absolute inset-0 flex items-center justify-center">
        Close
      </span>
      <span className="invisible">Close</span>
    </span>
  );
}

export function Navigation() {
  const pathname = usePathname();
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);

  /* Nav links — translated, except Appointment and Reserve Now (English). */
  const links = [
    { href: "/", label: t.nav.home },
    { href: "/about", label: t.nav.about },
    { href: "/events", label: t.nav.events },
    { href: "/menu", label: t.nav.menus },
    { href: "/reserve", label: "Appointment" },
  ];

  const mobileLinks = [
    { href: "/", label: t.nav.home },
    { href: "/about", label: t.nav.about },
    { href: "/events", label: t.nav.events },
    { href: "/menu", label: t.nav.menus },
    { href: "/reserve", label: "Appointment" },
  ];
  const menuRef = useRef<HTMLElement>(null);
  const previousPathnameRef = useRef(pathname);
  const hasAnimatedMenuRef = useRef(false);

  /* Close the flyout on real client navigations. */
  useEffect(() => {
    if (previousPathnameRef.current === pathname) return;
    previousPathnameRef.current = pathname;
    const timeout = window.setTimeout(() => setMenuOpen(false), 0);
    return () => window.clearTimeout(timeout);
  }, [pathname]);

  /* RORU page transitions also dismiss the flyout. */
  useEffect(() => {
    function onTransitionStart() {
      setMenuOpen(false);
    }
    window.addEventListener(PAGE_TRANSITION_START_EVENT, onTransitionStart);
    return () =>
      window.removeEventListener(PAGE_TRANSITION_START_EVENT, onTransitionStart);
  }, []);

  /* Flag the open state on <html> (lets the footer blur behind the menu). */
  useEffect(() => {
    document.documentElement.classList.toggle("roru-mobile-menu-open", menuOpen);
    return () =>
      document.documentElement.classList.remove("roru-mobile-menu-open");
  }, [menuOpen]);

  /* Mobile flyout open/close: full-height panel fades in with staggered items. */
  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;

    const items = Array.from(
      menu.querySelectorAll<HTMLElement>(".roru-mobile-menu-item")
    );

    if (!hasAnimatedMenuRef.current) {
      hasAnimatedMenuRef.current = true;
      gsap.set(menu, { autoAlpha: 0 });
      gsap.set(items, { autoAlpha: 0, y: 10 });
      return;
    }

    gsap.killTweensOf([menu, ...items]);

    if (menuOpen) {
      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .to(menu, { autoAlpha: 1, duration: 0.3 }, 0)
        .fromTo(
          items,
          { autoAlpha: 0, y: 10 },
          { autoAlpha: 1, y: 0, duration: 0.34, stagger: 0.05 },
          0.06
        );
      return;
    }

    gsap
      .timeline({ defaults: { ease: "power2.inOut" } })
      .to(items, { autoAlpha: 0, y: 8, duration: 0.16, stagger: 0.02 }, 0)
      .to(menu, { autoAlpha: 0, duration: 0.26 }, 0.06);
  }, [menuOpen]);

  /* Brand centered on desktop, left on mobile — matches WSSC layout. */
  const brandPositionClassName =
    "block shrink-0 min-[1032px]:absolute min-[1032px]:top-1/2 min-[1032px]:left-1/2 min-[1032px]:-translate-x-1/2 min-[1032px]:-translate-y-1/2";

  return (
    <>
      <header
        className="roru-nav m-0 h-16 w-full p-0 sm:h-20"
        id="roru-nav"
        aria-label="Main"
      >
        <div className="relative h-full w-full">
          <div className="relative grid h-full w-full grid-cols-[1fr_auto_1fr] items-center px-[var(--roru-section-pad-x)] min-[1032px]:flex min-[1032px]:justify-normal">
            {/* Left: mobile menu toggle / desktop language + nav links */}
            <div className="flex min-w-0 items-center justify-start gap-3 min-[1032px]:flex-1 min-[1032px]:gap-4">
              <button
                type="button"
                className="roru-nav-item inline-flex shrink-0 items-center justify-center overflow-hidden px-0 py-2 text-xs font-bold uppercase text-[var(--text)] transition-opacity hover:opacity-70 min-[1032px]:hidden"
                aria-controls="roru-mobile-menu"
                aria-expanded={menuOpen}
                aria-label={menuOpen ? "Close menu" : "Menu"}
                onClick={() => setMenuOpen((open) => !open)}
              >
                <MenuToggleLabel open={menuOpen} />
              </button>

              <LanguageToggle className="hidden min-[1032px]:inline-flex" />

              <nav
                className="hidden flex-wrap items-center justify-start gap-x-3 gap-y-1 min-[1032px]:flex min-[1032px]:gap-x-4"
                aria-label="Primary"
              >
                {links.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    aria-current={isActiveRoute(pathname, href) ? "page" : undefined}
                    className="roru-nav-item text-xs font-bold uppercase text-[var(--text)] transition-opacity hover:opacity-70"
                  >
                    {label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Center: brand — scroll to top of current page, not navigate home */}
            <div className={`justify-self-center ${brandPositionClassName}`}>
              <button
                type="button"
                className="roru-nav-item block leading-none text-[var(--text)]"
                aria-label="Back to top"
                onClick={() => {
                  setMenuOpen(false);
                  scrollPageToTop();
                }}
              >
                <NavLogo />
              </button>
            </div>

            {/* Right: reserve */}
            <div className="flex items-center justify-end gap-2 min-[1032px]:flex-1 sm:gap-3">
              <a
                href={TOCK_URL}
                target="_blank"
                rel="noreferrer"
                className="roru-nav-item shrink-0 px-0 py-2 text-xs font-bold uppercase text-[var(--text)] transition-opacity hover:opacity-70"
              >
                Reserve Now
              </a>
            </div>
          </div>

          {/* Mobile flyout — full-height panel: links centred, language toggle pinned bottom */}
          <nav
            ref={menuRef}
            id="roru-mobile-menu"
            className={`absolute top-full right-0 left-0 z-[45] h-[calc(100dvh-4rem)] overflow-hidden bg-transparent px-[var(--roru-section-pad-x)] sm:h-[calc(100dvh-5rem)] min-[1032px]:hidden ${
              menuOpen ? "pointer-events-auto" : "pointer-events-none"
            }`}
            aria-label="Mobile"
            aria-hidden={!menuOpen}
          >
            <div className="relative flex h-full flex-col items-center justify-center gap-2">
              {mobileLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActiveRoute(pathname, href) ? "page" : undefined}
                  className="roru-mobile-menu-item block rounded-lg px-6 py-3 text-center text-base font-bold uppercase text-[var(--text)] transition-opacity hover:opacity-70"
                >
                  {label}
                </Link>
              ))}
              <div className="roru-mobile-menu-item absolute right-0 bottom-[9vh] left-0 flex justify-center">
                <LanguageToggle />
              </div>
            </div>
          </nav>
        </div>
      </header>

      <button
        type="button"
        aria-label="Close menu"
        onClick={() => setMenuOpen(false)}
        className={`fixed inset-0 z-[998] bg-[color:color-mix(in_srgb,var(--surface)_82%,transparent)] backdrop-blur-3xl transition duration-300 min-[1032px]:hidden ${
          menuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
    </>
  );
}
