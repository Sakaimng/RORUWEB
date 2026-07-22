"use client";

import gsap from "gsap";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { NavLogo } from "./NavLogo";
import { LanguageToggle } from "./LanguageToggle";
import { MobileNavDock } from "./MobileNavDock";
import { TOCK_URL } from "@/lib/content";
import { useI18n } from "@/lib/i18n";
import { withLocale, stripLocale } from "@/lib/locale-routing";
import { PAGE_TRANSITION_START_EVENT } from "@/lib/roru-session";
import { scrollPageToTop } from "@/lib/scroll-to-top";
import { ORDER_ONLINE_ENABLED } from "@/lib/site-flags";
import {
  canShowInstallMenuLink,
  openInstallPrompt,
} from "@/lib/pwa-install";

function isActiveRoute(pathname: string, href: string) {
  const path = stripLocale(pathname);
  if (href === "/") return path === "/";
  return path === href || path.startsWith(`${href}/`);
}

export function Navigation() {
  const pathname = usePathname();
  const { t, lang } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showInstallLink, setShowInstallLink] = useState(false);

  /* Ordering is mobile-only when live — see ORDER_ONLINE_ENABLED in lib/site-flags.ts */
  const links = [
    { href: "/", label: t.nav.home },
    { href: "/about", label: t.nav.about },
    { href: "/events", label: t.nav.events },
    { href: "/menu", label: t.nav.menus },
    { href: "/reserve", label: t.nav.reserve },
  ];

  const mobileLinks = ORDER_ONLINE_ENABLED
    ? [...links.slice(0, 4), { href: "/order", label: t.nav.order }, ...links.slice(4)]
    : links;
  const menuRef = useRef<HTMLElement>(null);
  const previousPathnameRef = useRef(pathname);
  const hasAnimatedMenuRef = useRef(false);

  /* Close the flyout on real client navigations. */
  useEffect(() => {
    setShowInstallLink(canShowInstallMenuLink());
  }, []);

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
            {/* Left: desktop language + nav links */}
            <div className="flex min-w-0 items-center justify-start gap-3 min-[1032px]:flex-1 min-[1032px]:gap-4">
              <LanguageToggle className="hidden min-[1032px]:inline-flex" />

              <nav
                className="hidden flex-wrap items-center justify-start gap-x-3 gap-y-1 min-[1032px]:flex min-[1032px]:gap-x-4"
                aria-label="Primary"
              >
                {links.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={withLocale(href, lang)}
                    aria-current={isActiveRoute(pathname, href) ? "page" : undefined}
                    className="roru-nav-item text-xs font-bold uppercase transition-opacity hover:opacity-70"
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
                className="roru-nav-item block leading-none"
                aria-label="Back to top"
                onClick={() => {
                  setMenuOpen(false);
                  scrollPageToTop();
                }}
              >
                <NavLogo />
              </button>
            </div>

            {/* Right: reserve (desktop only) */}
            <div className="hidden items-center justify-end gap-2 min-[1032px]:flex min-[1032px]:flex-1 sm:gap-3">
              <a
                href={TOCK_URL}
                target="_blank"
                rel="noreferrer"
                className="roru-nav-item shrink-0 px-0 py-2 text-xs font-bold uppercase transition-opacity hover:opacity-70"
              >
                Reserve Now
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Outside header so fixed positioning is not trapped by .roru-nav transform */}
      <nav
        ref={menuRef}
        id="roru-mobile-menu"
        className={`fixed right-0 left-0 top-16 z-[1000] h-[calc(100dvh-4rem-var(--roru-bottom-dock-clear))] overflow-hidden bg-transparent px-[var(--roru-section-pad-x)] sm:top-20 sm:h-[calc(100dvh-5rem-var(--roru-bottom-dock-clear))] min-[1032px]:hidden ${
          menuOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-label="Mobile"
        aria-hidden={!menuOpen}
      >
        <div className="relative flex h-full flex-col items-center justify-center gap-2">
          {mobileLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={withLocale(href, lang)}
              aria-current={isActiveRoute(pathname, href) ? "page" : undefined}
              className="roru-mobile-menu-item block rounded-lg px-6 py-3 text-center text-base font-bold uppercase transition-opacity hover:opacity-70"
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </Link>
          ))}
          {showInstallLink ? (
            <button
              type="button"
              className="roru-mobile-menu-item block rounded-lg px-6 py-3 text-center text-base font-bold uppercase transition-opacity hover:opacity-70"
              onClick={() => {
                setMenuOpen(false);
                openInstallPrompt();
              }}
            >
              {t.install.menuLink}
            </button>
          ) : null}
          <div className="roru-mobile-menu-item absolute right-0 bottom-[9vh] left-0 flex justify-center">
            <LanguageToggle />
          </div>
        </div>
      </nav>

      <MobileNavDock
        menuOpen={menuOpen}
        onMenuToggle={() => setMenuOpen((open) => !open)}
      />

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
