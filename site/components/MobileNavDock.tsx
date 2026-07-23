"use client";

import type { ReactNode, RefObject } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useOrderCart } from "@/components/order/OrderCartProvider";
import { useI18n } from "@/lib/i18n";
import { stripLocale, withLocale } from "@/lib/locale-routing";
import { isHomePathname } from "@/lib/roru-path";
import { ORDER_ONLINE_ENABLED } from "@/lib/site-flags";
import { scrollPageToTop } from "@/lib/scroll-to-top";

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

function OrderIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 9V7a5 5 0 0 1 10 0v2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M5 9h14l-1.2 10.5a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8L5 9Z"
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
  menuButtonRef?: RefObject<HTMLButtonElement | null>;
};

type DockShellProps = Props & {
  orderStatus?: ReactNode;
  secondSlot?: ReactNode;
};

function MobileNavDockShell({
  menuOpen,
  onMenuToggle,
  menuButtonRef,
  orderStatus,
  secondSlot,
}: DockShellProps) {
  return (
    <div className="roru-nav-bottom" id="roru-nav-bottom" aria-label="Mobile navigation">
      <div className="roru-nav-bottom__shell">
        {orderStatus}
        <div
          className={`roru-nav-bottom__pill${
            secondSlot ? " roru-nav-bottom__pill--4" : ""
          }`}
        >
          <HomeSlot />
          {secondSlot}
          <button
            ref={menuButtonRef}
            type="button"
            aria-controls="roru-mobile-menu"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Menu"}
            className="roru-nav-bottom__btn roru-nav-bottom__btn--menu roru-nav-item"
            onClick={onMenuToggle}
          >
            <MenuIcon open={menuOpen} />
          </button>
          <ReserveSlot />
        </div>
      </div>
    </div>
  );
}

function HomeSlot() {
  const pathname = usePathname() ?? "/";
  const { lang } = useI18n();
  const homeHref = withLocale("/", lang);
  const isHome = isHomePathname(pathname);

  if (isHome) {
    return (
      <button
        type="button"
        aria-current="page"
        aria-label="Back to top"
        className="roru-nav-bottom__btn roru-nav-item is-active"
        onClick={() => scrollPageToTop()}
      >
        <HomeIcon />
      </button>
    );
  }

  return (
    <Link href={homeHref} aria-label="Home" className="roru-nav-bottom__btn roru-nav-item">
      <HomeIcon />
    </Link>
  );
}

function ReserveSlot() {
  const { lang, t } = useI18n();
  const pathname = usePathname() ?? "/";
  const isReserve = stripLocale(pathname) === "/reserve";

  return (
    <Link
      href={withLocale("/reserve", lang)}
      aria-current={isReserve ? "page" : undefined}
      aria-label={t.nav.reserve}
      className={`roru-nav-bottom__btn roru-nav-bottom__btn--reserve roru-nav-item${
        isReserve ? " is-active" : ""
      }`}
    >
      <ReserveIcon />
    </Link>
  );
}

function MobileNavDockWithOrder(props: Props) {
  const pathname = usePathname() ?? "/";
  const { lang, t } = useI18n();
  const { itemCount, activeOrderTracking, trackingSheetOpen, openOrderTracking } =
    useOrderCart();
  const orderHref = withLocale("/order", lang);
  const isOrder = stripLocale(pathname) === "/order";
  const showCartBadge = !isOrder && itemCount > 0;
  const showOrderStatus = activeOrderTracking != null && !trackingSheetOpen;
  const orderStatusLabel =
    activeOrderTracking?.fulfillment === "pickup"
      ? "Pickup order in progress"
      : "Delivery order in progress";

  return (
    <MobileNavDockShell
      {...props}
      orderStatus={
        showOrderStatus ? (
          <button
            type="button"
            className="roru-nav-bottom__order-status"
            onClick={openOrderTracking}
            aria-label={`${orderStatusLabel}. Tap to view order tracking.`}
          >
            <span className="roru-nav-bottom__order-status-dot" aria-hidden />
            <span className="roru-nav-bottom__order-status-text">{orderStatusLabel}</span>
          </button>
        ) : null
      }
      secondSlot={
        <Link
          href={orderHref}
          aria-current={isOrder ? "page" : undefined}
          aria-label={
            showCartBadge
              ? `${t.nav.order}, ${itemCount} items in cart`
              : t.nav.order
          }
          className={`roru-nav-bottom__btn roru-nav-item${isOrder ? " is-active" : ""}`}
        >
          <span className="roru-nav-bottom__icon-wrap">
            <OrderIcon />
            {showCartBadge ? (
              <span className="roru-nav-bottom__badge" aria-hidden>
                {itemCount}
              </span>
            ) : null}
          </span>
        </Link>
      }
    />
  );
}

export function MobileNavDock(props: Props) {
  if (ORDER_ONLINE_ENABLED) {
    return <MobileNavDockWithOrder {...props} />;
  }
  return <MobileNavDockShell {...props} />;
}
