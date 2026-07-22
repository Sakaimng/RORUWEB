"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ORDER_CATALOG_BY_ID,
  ORDER_CATEGORIES,
  type CatalogItem,
} from "@/lib/order-catalog";
import { RESTAURANT } from "@/lib/order-config";
import { displayItemName, formatHkd } from "@/lib/order-utils";
import { OrderCartSheet } from "@/components/order/OrderCartSheet";
import { OrderCheckoutSheet } from "@/components/order/OrderCheckoutSheet";
import { useOrderCart } from "@/components/order/OrderCartProvider";
import { OrderAddressField } from "@/components/order/OrderAddressField";
import type { DeliveryAddress } from "@/lib/order-types";

function itemInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "R";
}

function MenuItemCard({
  item,
  quantity,
  onAdd,
}: {
  item: CatalogItem;
  quantity: number;
  onAdd: (id: string) => void;
}) {
  const inCart = quantity > 0;
  const label = displayItemName(item);

  return (
    <article className="order-item">
      <div className="order-item__thumb" aria-hidden>
        <span>{itemInitial(item.name)}</span>
      </div>
      <div className="order-item__body">
        <div className="order-item__head">
          <h3 className="order-item__name">{label}</h3>
          <p className="order-item__price">{formatHkd(item.price)}</p>
        </div>
        {item.description ? (
          <p className="order-item__desc">{item.description}</p>
        ) : null}
        {item.nameZh ? <p className="order-item__zh">{item.nameZh}</p> : null}
      </div>
      <button
        type="button"
        className={`order-item__add${inCart ? " is-in-cart" : ""}`}
        onClick={() => onAdd(item.id)}
        aria-label={
          inCart
            ? `${quantity} ${label} in cart, add another`
            : `Add ${label} to cart`
        }
      >
        {inCart ? quantity : "+"}
      </button>
    </article>
  );
}

export function OrderPageClient() {
  const {
    lines,
    fulfillment,
    address,
    totals,
    itemCount,
    cartOpen,
    checkoutOpen,
    activeOrderTracking,
    setFulfillment,
    setAddress,
    addItem,
    openCart,
    openCheckout,
    closeCart,
    closeCheckout,
  } = useOrderCart();

  const [addressInput, setAddressInput] = useState(address?.formatted ?? "");
  const [activeCategory, setActiveCategory] = useState(ORDER_CATEGORIES[0]?.id ?? "");
  const [overlayRoot, setOverlayRoot] = useState<HTMLElement | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const categoryChipRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const stickyHeadRef = useRef<HTMLDivElement | null>(null);
  /** While a chip-tap smooth scroll is in flight, the scroll-spy must not fight it. */
  const suppressSpyRef = useRef(false);
  const settleTimerRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    setOverlayRoot(document.body);
  }, []);

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, CatalogItem[]>();
    for (const category of ORDER_CATEGORIES) {
      map.set(
        category.id,
        category.itemIds
          .map((id) => ORDER_CATALOG_BY_ID[id])
          .filter((item): item is CatalogItem => item != null),
      );
    }
    return map;
  }, []);

  const quantitiesById = useMemo(() => {
    const map = new Map<string, number>();
    for (const line of lines) {
      map.set(line.catalogId, line.quantity);
    }
    return map;
  }, [lines]);

  useEffect(() => {
    setAddressInput(address?.formatted ?? "");
  }, [address]);

  /* Scroll spy. The active band starts exactly at the measured bottom of the sticky
     head (mode toggle + address + category track), so the highlighted chip is always
     the category visually underneath the track — not a hardcoded-viewport guess. */
  useEffect(() => {
    let observer: IntersectionObserver | null = null;

    const build = () => {
      observer?.disconnect();
      const stickyBottom = Math.max(
        0,
        Math.round(stickyHeadRef.current?.getBoundingClientRect().bottom ?? 120),
      );
      const viewportH = Math.max(window.innerHeight, 1);
      const band = Math.max(160, Math.round((viewportH - stickyBottom) * 0.45));
      const bottomMargin = Math.max(0, viewportH - stickyBottom - band);

      observer = new IntersectionObserver(
        (entries) => {
          if (suppressSpyRef.current) return;
          const visible = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
          if (visible?.target instanceof HTMLElement && visible.target.dataset.category) {
            setActiveCategory(visible.target.dataset.category);
          }
        },
        {
          root: null,
          rootMargin: `-${stickyBottom}px 0px -${bottomMargin}px 0px`,
          threshold: [0, 0.2, 0.5, 0.8],
        },
      );

      for (const category of ORDER_CATEGORIES) {
        const node = sectionRefs.current[category.id];
        if (node) observer.observe(node);
      }
    };

    build();
    window.addEventListener("resize", build);
    return () => {
      window.removeEventListener("resize", build);
      observer?.disconnect();
    };
    /* Sticky head height changes with the fulfillment mode (address row vs pickup line). */
  }, [fulfillment]);

  /* While a programmatic scroll is running, keep deferring the spy until it settles. */
  useEffect(() => {
    const onScroll = () => {
      if (!suppressSpyRef.current) return;
      if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = window.setTimeout(() => {
        suppressSpyRef.current = false;
      }, 160);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
    };
  }, []);

  useEffect(() => {
    categoryChipRefs.current[activeCategory]?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [activeCategory]);

  function scrollToCategory(categoryId: string) {
    const section = sectionRefs.current[categoryId];
    if (!section) return;
    setActiveCategory(categoryId);

    /* Own the scroll: spy stays quiet until it settles, so the tapped chip cannot
       bounce back to a neighbour mid-flight or on landing. */
    suppressSpyRef.current = true;
    if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
    settleTimerRef.current = window.setTimeout(() => {
      suppressSpyRef.current = false;
    }, 400);

    const stickyBottom = stickyHeadRef.current?.getBoundingClientRect().bottom ?? 0;
    const target =
      window.scrollY + section.getBoundingClientRect().top - stickyBottom - 8;
    window.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
  }

  function handleAddressSelect(next: DeliveryAddress) {
    setAddress(next);
    setAddressInput(next.formatted);
  }

  function handleAddressInputChange(next: string) {
    setAddressInput(next);
    if (address && next.trim() !== address.formatted.trim()) {
      setAddress(null);
    }
  }

  return (
    <div className={`order-page order-page--${fulfillment}`}>
      <div className="order-sticky-head" ref={stickyHeadRef}>
        <header className="order-top">
          <div className="order-top__fulfillment">
            <button
              type="button"
              className={`order-top__mode${fulfillment === "delivery" ? " is-active" : ""}`}
              onClick={() => setFulfillment("delivery")}
            >
              Delivery
            </button>
            <button
              type="button"
              className={`order-top__mode${fulfillment === "pickup" ? " is-active" : ""}`}
              onClick={() => setFulfillment("pickup")}
            >
              Pickup
            </button>
          </div>

          {fulfillment === "delivery" ? (
            <div className="order-top__address">
              <OrderAddressField
                value={addressInput}
                onChange={handleAddressInputChange}
                onSelect={handleAddressSelect}
                placeholder="Where to?"
                className="order-top__address-field"
              />
            </div>
          ) : (
            <p className="order-top__pickup">{RESTAURANT.address}</p>
          )}

          <p className="order-top__eta">{totals.estimate.label}</p>
        </header>

        <nav className="order-categories" aria-label="Menu categories">
          <div className="order-categories__track">
            {ORDER_CATEGORIES.map((category) => (
              <button
                key={category.id}
                type="button"
                ref={(node) => {
                  categoryChipRefs.current[category.id] = node;
                }}
                className={`order-categories__chip${
                  activeCategory === category.id ? " is-active" : ""
                }`}
                onClick={() => scrollToCategory(category.id)}
              >
                {category.label}
              </button>
            ))}
          </div>
        </nav>
      </div>

      <div className="order-page__menu">
        {ORDER_CATEGORIES.map((category) => (
          <section
            key={category.id}
            id={`order-cat-${category.id}`}
            data-category={category.id}
            ref={(node) => {
              sectionRefs.current[category.id] = node;
            }}
            className="order-section"
          >
            <header className="order-section__header">
              <p className="order-section__board">{category.boardName}</p>
              <h2 className="order-section__title">{category.sectionName}</h2>
            </header>
            <div className="order-section__items">
              {(itemsByCategory.get(category.id) ?? []).map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  quantity={quantitiesById.get(item.id) ?? 0}
                  onAdd={addItem}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {overlayRoot
        ? createPortal(
            <div className="order-portals">
              {itemCount > 0 && !cartOpen && !checkoutOpen && !activeOrderTracking ? (
                <button type="button" className="order-cart-bar" onClick={openCart}>
                  <span className="order-cart-bar__count">{itemCount}</span>
                  <span className="order-cart-bar__label">View cart</span>
                  <span className="order-cart-bar__total">{formatHkd(totals.total)}</span>
                </button>
              ) : null}
              {cartOpen ? (
                <OrderCartSheet onCheckout={openCheckout} onClose={closeCart} />
              ) : null}
              {checkoutOpen ? <OrderCheckoutSheet onClose={closeCheckout} /> : null}
            </div>,
            overlayRoot,
          )
        : null}
    </div>
  );
}
