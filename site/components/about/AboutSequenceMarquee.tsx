"use client";

import gsap from "gsap";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { ABOUT_MARQUEE_SIZES, PREOPTIMIZED_IMAGE } from "@/lib/image-display";

type Item = { src: string; n: string; alt: string };

export type AboutSequenceAxis = "horizontal" | "vertical";

export function AboutSequenceMarquee({
  items,
  axis = "horizontal",
}: {
  items: readonly Item[];
  axis?: AboutSequenceAxis;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    const maybeTrack = trackRef.current;
    if (!viewport || !maybeTrack) return;
    const trackEl: HTMLDivElement = maybeTrack;

    const articleEls = Array.from(
      trackEl.querySelectorAll<HTMLElement>(".roru-about-sequence__item")
    );
    const linkEls = gsap.utils.toArray<HTMLElement>(
      trackEl.querySelectorAll(".roru-about-sequence__link")
    );
    const imgEls = Array.from(
      trackEl.querySelectorAll<HTMLImageElement>(".roru-about-sequence__image")
    );

    if (!articleEls.length) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      gsap.set(articleEls, { opacity: 1, y: 0, x: 0 });
      return;
    }

    let rafId: number | null = null;
    const baseSpeed = axis === "vertical" ? 0.42 : 0.35;
    let targetSpeed = baseSpeed;
    let currentSpeed = baseSpeed;
    const gap = 9;

    const state = articleEls.map((el) => ({
      el,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
    }));

    function measureItemsHorizontal() {
      let cursor = 0;
      state.forEach((entry) => {
        entry.width = entry.el.offsetWidth;
        entry.height = entry.el.offsetHeight;
        entry.x = cursor;
        entry.y = 0;
        cursor += entry.width + gap;
      });
      trackEl.style.height = `${articleEls[0]?.offsetHeight || 0}px`;
    }

    function measureItemsVertical() {
      let cursor = 0;
      state.forEach((entry) => {
        entry.width = entry.el.offsetWidth;
        entry.height = entry.el.offsetHeight;
        entry.x = 0;
        entry.y = cursor;
        cursor += entry.height + gap;
      });
      trackEl.style.width = "100%";
      trackEl.style.minHeight = `${cursor}px`;
    }

    function renderItemsHorizontal() {
      state.forEach((entry) => {
        gsap.set(entry.el, { x: entry.x, y: 0 });
      });
    }

    function renderItemsVertical() {
      state.forEach((entry) => {
        gsap.set(entry.el, { x: 0, y: entry.y });
      });
    }

    function getRightMostEdge() {
      return Math.max(...state.map((e) => e.x + e.width));
    }

    function getBottomMostEdge() {
      return Math.max(...state.map((e) => e.y + e.height));
    }

    function normalizeItemsHorizontal() {
      state.forEach((entry) => {
        if (entry.x + entry.width <= 0) {
          entry.x = getRightMostEdge() + gap;
        }
      });
    }

    function normalizeItemsVertical() {
      state.forEach((entry) => {
        if (entry.y + entry.height <= 0) {
          entry.y = getBottomMostEdge() + gap;
        }
      });
    }

    function applyDeltaHorizontal(delta: number) {
      state.forEach((entry) => {
        entry.x += delta;
      });
      normalizeItemsHorizontal();
      renderItemsHorizontal();
    }

    function applyDeltaVertical(delta: number) {
      state.forEach((entry) => {
        entry.y += delta;
      });
      normalizeItemsVertical();
      renderItemsVertical();
    }

    function tick() {
      currentSpeed += (targetSpeed - currentSpeed) * 0.08;
      if (Math.abs(currentSpeed) > 0.001) {
        if (axis === "vertical") applyDeltaVertical(-currentSpeed);
        else applyDeltaHorizontal(-currentSpeed);
      }
      rafId = requestAnimationFrame(tick);
    }

    function startLoop() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(tick);
    }

    function refreshLoop() {
      if (rafId) cancelAnimationFrame(rafId);
      if (axis === "vertical") {
        measureItemsVertical();
        renderItemsVertical();
      } else {
        measureItemsHorizontal();
        renderItemsHorizontal();
      }
      currentSpeed = baseSpeed;
      targetSpeed = baseSpeed;
      startLoop();
    }

    function waitForImages(imgs: HTMLImageElement[]) {
      const firstBatch = imgs.slice(0, Math.min(4, imgs.length));
      return Promise.all(
        firstBatch.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise<void>((resolve) => {
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => resolve(), { once: true });
          });
        })
      );
    }

    const onResize = () => {
      refreshLoop();
    };

    const onEnter = () => {
      targetSpeed = 0;
    };
    const onLeave = () => {
      targetSpeed = baseSpeed;
    };

    linkEls.forEach((link) => {
      link.addEventListener("mouseenter", onEnter);
      link.addEventListener("mouseleave", onLeave);
    });

    waitForImages(imgEls).then(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(refreshLoop);
      });
    });

    // Axis / Strict Mode can re-run this effect while a prior `from` is still
    // animating opacity; without killing, articles can stay stuck mid-fade.
    gsap.killTweensOf(articleEls);
    gsap.set(articleEls, { opacity: 1 });
    gsap.from(articleEls, {
      opacity: 0,
      duration: 0.75,
      ease: "power3.out",
      stagger: 0.06,
      delay: 0.12,
      onComplete: () => {
        gsap.set(articleEls, { opacity: 1 });
      },
    });

    window.addEventListener("resize", onResize);

    return () => {
      gsap.killTweensOf(articleEls);
      gsap.set(articleEls, { opacity: 1 });
      window.removeEventListener("resize", onResize);
      if (rafId) cancelAnimationFrame(rafId);
      linkEls.forEach((link) => {
        link.removeEventListener("mouseenter", onEnter);
        link.removeEventListener("mouseleave", onLeave);
      });
    };
  }, [items.length, axis]);

  const rootClass =
    axis === "vertical"
      ? "roru-about-sequence roru-about-sequence--vertical"
      : "roru-about-sequence";

  return (
    <div className={rootClass}>
      <div ref={viewportRef} className="roru-about-sequence__viewport">
        <div
          ref={trackRef}
          className="roru-about-sequence__track"
          id="roru-about-sequence-track"
        >
          {items.map((item, idx) => (
            <article
              key={`${item.src}-${idx}`}
              className="roru-about-sequence__item"
            >
              <a
                href="#"
                className="roru-about-sequence__link"
                onClick={(e) => e.preventDefault()}
              >
                <div className="roru-about-sequence__image-wrap">
                  <Image
                    src={item.src}
                    alt={item.alt}
                    width={300}
                    height={300}
                    className="roru-about-sequence__image h-full w-full object-cover"
                    sizes={ABOUT_MARQUEE_SIZES}
                    loading="lazy"
                    decoding="async"
                    {...PREOPTIMIZED_IMAGE}
                  />
                </div>
                {item.n ? (
                  <div className="roru-about-sequence__index">{item.n}</div>
                ) : null}
              </a>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
