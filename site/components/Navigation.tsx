"use client";

import gsap from "gsap";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { NavLogo } from "./NavLogo";
import { LanguageToggle } from "./LanguageToggle";
import { MobileNavDock } from "./MobileNavDock";
import { TockLink } from "./TockLink";
import { TOCK_URL } from "@/lib/content";
import { trackTockReservationCheckout } from "@/lib/analytics";
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

function MobileMenuLinkIcon({ href }: { href: string }) {
  const props = {
    className: "roru-mobile-menu-item__icon",
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": true,
  };

  switch (href) {
    case "/":
      return (
        <svg {...props}>
          <path
            d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-8.5Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "/about":
      return (
        <svg {...props}>
          <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M5.5 20c.9-3.6 3.1-5.4 6.5-5.4s5.6 1.8 6.5 5.4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      );
    case "/events":
      return (
        <svg {...props}>
          <rect x="4" y="5.5" width="16" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M4 10h16M8 3.5v4M16 3.5v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M8 14h3M13 14h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case "/menu":
      return (
        <svg {...props}>
          <path d="M6.5 4v7M4.5 4v4a2 2 0 0 0 4 0V4M6.5 11v9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M15.5 4v16M15.5 4c2.3 1.2 3.5 3.2 3.5 6h-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "/delivery":
      return (
        <svg {...props}>
          <path d="M3.5 7.5h11v9h-11zM14.5 10.5h3l2 3v3h-5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <circle cx="7" cy="18" r="1.5" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="17.5" cy="18" r="1.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M6.5 10.5h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case "/order":
      return (
        <svg {...props}>
          <path d="M8 9V7a4 4 0 0 1 8 0v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M5.5 9h13l-1 10H6.5l-1-10Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      );
    case "/install":
      return (
        <svg {...props}>
          <path d="M12 4v10M8.5 10.5 12 14l3.5-3.5M5 19h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <rect x="4" y="5.5" width="16" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M4 10h16M8 3.5v4M16 3.5v4M8.5 15l2.1 2.1L16 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
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
    { href: "/delivery", label: t.nav.delivery },
    { href: "/reserve", label: t.nav.reserve },
  ];

  const mobileLinks = ORDER_ONLINE_ENABLED
    ? [...links.slice(0, 4), { href: "/order", label: t.nav.order }, ...links.slice(4)]
    : links;
  const menuRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const previousPathnameRef = useRef(pathname);
  const hasAnimatedMenuRef = useRef(false);
  const shouldRestoreMenuButtonFocusRef = useRef(false);

  const closeMenu = useCallback((restoreMenuButtonFocus = false) => {
    if (restoreMenuButtonFocus) {
      shouldRestoreMenuButtonFocusRef.current = true;
    }
    setMenuOpen(false);
  }, []);

  const toggleMenu = useCallback(() => {
    setMenuOpen((open) => {
      if (open) {
        shouldRestoreMenuButtonFocusRef.current = true;
      }
      return !open;
    });
  }, []);

  /* Close the flyout on real client navigations. */
  useEffect(() => {
    setShowInstallLink(canShowInstallMenuLink());
  }, []);

  useEffect(() => {
    if (previousPathnameRef.current === pathname) return;
    previousPathnameRef.current = pathname;
    const timeout = window.setTimeout(() => closeMenu(), 0);
    return () => window.clearTimeout(timeout);
  }, [closeMenu, pathname]);

  /* RORU page transitions also dismiss the flyout. */
  useEffect(() => {
    function onTransitionStart() {
      closeMenu();
    }
    window.addEventListener(PAGE_TRANSITION_START_EVENT, onTransitionStart);
    return () =>
      window.removeEventListener(PAGE_TRANSITION_START_EVENT, onTransitionStart);
  }, [closeMenu]);

  /* Flag the open state on <html> (lets the footer blur behind the menu). */
  useEffect(() => {
    document.documentElement.classList.toggle("roru-mobile-menu-open", menuOpen);
    return () =>
      document.documentElement.classList.remove("roru-mobile-menu-open");
  }, [menuOpen]);

  useEffect(() => {
    const menu = menuRef.current;
    if (menuOpen) {
      const frame = window.requestAnimationFrame(() => {
        menu
          ?.querySelector<HTMLElement>(".roru-mobile-menu-item")
          ?.focus({ preventScroll: true });
      });
      return () => window.cancelAnimationFrame(frame);
    }

    if (!shouldRestoreMenuButtonFocusRef.current) return;
    shouldRestoreMenuButtonFocusRef.current = false;
    const frame = window.requestAnimationFrame(() => {
      menuButtonRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeMenu(true);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeMenu, menuOpen]);

  /* Mobile flyout open/close: full-height panel fades in with staggered items. */
  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;

    const items = Array.from(
      menu.querySelectorAll<HTMLElement>(".roru-mobile-menu-item")
    );
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (!hasAnimatedMenuRef.current) {
      hasAnimatedMenuRef.current = true;
      gsap.set(menu, { autoAlpha: 0 });
      gsap.set(items, { autoAlpha: 0, y: reducedMotion ? 0 : 10 });
      return;
    }

    gsap.killTweensOf([menu, ...items]);

    if (reducedMotion) {
      gsap.set(menu, { autoAlpha: menuOpen ? 1 : 0 });
      gsap.set(items, { autoAlpha: menuOpen ? 1 : 0, y: 0 });
      return;
    }

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
                    className="roru-nav-item text-xs font-bold uppercase transition-opacity"
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
                  closeMenu();
                  scrollPageToTop();
                }}
              >
                <NavLogo />
              </button>
            </div>

            {/* Right: reserve (desktop only) */}
            <div className="hidden items-center justify-end gap-2 min-[1032px]:flex min-[1032px]:flex-1 sm:gap-3">
              <TockLink
                href={TOCK_URL}
                campaign="desktop_navigation"
                content="reserve_now"
                target="_blank"
                rel="noopener"
                className="roru-nav-item shrink-0 px-0 py-2 text-xs font-bold uppercase transition-opacity"
                onClick={() =>
                  trackTockReservationCheckout({
                    source: "desktop_navigation",
                  })
                }
              >
                Reserve Now
              </TockLink>
            </div>
          </div>
        </div>
      </header>

      {/* Outside header so fixed positioning is not trapped by .roru-nav transform */}
      <nav
        ref={menuRef}
        id="roru-mobile-menu"
        className="roru-mobile-menu"
        aria-label="Mobile"
        aria-hidden={!menuOpen}
      >
        <div className="roru-mobile-menu__content relative flex h-full flex-col items-center justify-center">
          <div className="roru-mobile-menu__grid">
            {mobileLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={withLocale(href, lang)}
                aria-current={isActiveRoute(pathname, href) ? "page" : undefined}
                className="roru-mobile-menu-item roru-mobile-menu-item--block"
                onClick={() => closeMenu()}
              >
                <MobileMenuLinkIcon href={href} />
                <span>{label}</span>
              </Link>
            ))}
            {showInstallLink ? (
              <button
                type="button"
                className="roru-mobile-menu-item roru-mobile-menu-item--block roru-mobile-menu-item--wide"
                onClick={() => {
                  closeMenu();
                  openInstallPrompt();
                }}
              >
                <MobileMenuLinkIcon href="/install" />
                <span>{t.install.menuLink}</span>
              </button>
            ) : null}
          </div>
          <div className="roru-mobile-menu__language absolute right-0 bottom-[9vh] left-0 flex justify-center">
            <LanguageToggle />
          </div>
        </div>
      </nav>

      <MobileNavDock
        menuOpen={menuOpen}
        onMenuToggle={toggleMenu}
        menuButtonRef={menuButtonRef}
      />

      <button
        type="button"
        aria-label="Close menu"
        aria-hidden={!menuOpen}
        tabIndex={menuOpen ? 0 : -1}
        onClick={() => closeMenu(true)}
        className={`roru-mobile-menu-scrim${menuOpen ? " is-open" : ""}`}
      />
    </>
  );
}
