"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect } from "react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const ENTER_ATTR = "data-roru-reveal";
/**
 * Replay-on-enter/exit reveal driver.
 * - Avoids touching `next/image` <img> nodes directly to prevent hydration mismatches.
 * - Uses ScrollTrigger toggleActions so animations replay both directions.
 */
export function HomeViewAnimations() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let ctx: gsap.Context | null = null;
    let waitToken: number | null = null;
    let cancelled = false;

    function build() {
      if (cancelled) return;
      ctx = gsap.context(() => {
        const blocks = gsap.utils.toArray<HTMLElement>(`[${ENTER_ATTR}]`);
        blocks.forEach((el) => {
          const direction = el.getAttribute(ENTER_ATTR) ?? "up";
          const delay = Number(el.getAttribute("data-roru-reveal-delay") ?? "0");

          let from: gsap.TweenVars = { opacity: 0, y: 48 };
          if (direction === "down") from = { opacity: 0, y: -48 };
          else if (direction === "left") from = { opacity: 0, x: 48 };
          else if (direction === "right") from = { opacity: 0, x: -48 };
          else if (direction === "scale") from = { opacity: 0, scale: 0.94 };
          else if (direction === "fade") from = { opacity: 0 };

          gsap.fromTo(el, from, {
            opacity: 1,
            x: 0,
            y: 0,
            scale: 1,
            duration: 0.95,
            ease: "expo.out",
            delay,
            scrollTrigger: {
              trigger: el,
              start: "top 88%",
              end: "bottom 12%",
              toggleActions: "play reverse play reverse",
            },
          });
        });

        const stagger = gsap.utils.toArray<HTMLElement>("[data-roru-stagger]");
        stagger.forEach((parent) => {
          const items = parent.querySelectorAll<HTMLElement>("[data-roru-stagger-item]");
          if (!items.length) return;
          gsap.fromTo(
            items,
            { opacity: 0, y: 36 },
            {
              opacity: 1,
              y: 0,
              duration: 0.75,
              ease: "expo.out",
              stagger: 0.07,
              scrollTrigger: {
                trigger: parent,
                start: "top 85%",
                end: "bottom 18%",
                toggleActions: "play reverse play reverse",
              },
            }
          );
        });
      });

      ScrollTrigger.refresh();
    }

    function schedule() {
      // Defer until after hydration of dynamically loaded sections.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          waitToken = window.setTimeout(build, 150);
        });
      });
    }

    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });

    return () => {
      cancelled = true;
      if (waitToken != null) window.clearTimeout(waitToken);
      window.removeEventListener("load", schedule);
      ctx?.revert();
    };
  }, []);

  return null;
}
