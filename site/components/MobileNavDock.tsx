"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TOCK_URL } from "@/lib/content";
import { useI18n } from "@/lib/i18n";
import { withLocale, stripLocale } from "@/lib/locale-routing";

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-8.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <span className="roru-nav-bottom__menu-icon" aria-hidden>
      <svg
        className={`roru-nav-bottom__menu-bars${open ? " is-hidden" : ""}`}
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
      <svg
        className={`roru-nav-bottom__menu-close${open ? " is-visible" : ""}`}
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function ReserveIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="4"
        y="5"
        width="16"
        height="15"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path d="M4 10h16M9 3v3M15 3v3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

type Props = {
  menuOpen: boolean;
  onMenuToggle: () => void;
};

export function MobileNavDock({ menuOpen, onMenuToggle }: Props) {
  const pathname = usePathname() ?? "/";
  const { lang } = useI18n();
  const homeHref = withLocale("/", lang);
  const isHome = stripLocale(pathname) === "/";

  return (
    <div className="roru-nav-bottom" id="roru-nav-bottom" aria-label="Mobile navigation">
      <div className="roru-nav-bottom__shell">
        <div className="roru-nav-bottom__pill">
          <Link
            href={homeHref}
            aria-current={isHome ? "page" : undefined}
            aria-label="Home"
            className={`roru-nav-bottom__btn roru-nav-item${isHome ? " is-active" : ""}`}
          >
            <HomeIcon />
          </Link>

          <button
            type="button"
            aria-controls="roru-mobile-menu"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Menu"}
            className="roru-nav-bottom__btn roru-nav-bottom__btn--menu roru-nav-item"
            onClick={onMenuToggle}
          >
            <MenuIcon open={menuOpen} />
          </button>

          <a
            href={TOCK_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Reserve now"
            className="roru-nav-bottom__btn roru-nav-bottom__btn--reserve roru-nav-item"
          >
            <ReserveIcon />
          </a>
        </div>
      </div>
    </div>
  );
}
