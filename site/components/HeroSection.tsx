"use client";

import gsap from "gsap";
import Image from "next/image";
import { useLayoutEffect, useRef } from "react";
import { HOME_HERO_IMAGES } from "@/lib/content";
import { PREOPTIMIZED_IMAGE } from "@/lib/image-display";
import { useI18n } from "@/lib/i18n";

/** Renders the tagline as two lines, each line's words wrapped for the reveal animation. */
function TaglineLines({ lines }: { lines: readonly [string, string] }) {
  return (
    <>
      {lines.map((line, li) => (
        <span key={li} className="block">
          {line.split(/\s+/).map((w, wi) => (
            <span key={`${w}-${wi}`}>
              {wi > 0 ? " " : null}
              <span className="word-wrap">
                <span className="word">{w}</span>
              </span>
            </span>
          ))}
        </span>
      ))}
    </>
  );
}

export function HeroSection() {
  const { t } = useI18n();
  const rootRef = useRef<HTMLElement>(null);
  const playedRef = useRef(false);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const titleNode = root.querySelector<HTMLElement>(".roru-hero__title");
    if (!titleNode) return;
    const title: HTMLElement = titleNode;

    const words = gsap.utils.toArray<HTMLElement>(".word", title);
    if (!words.length) {
      title.style.removeProperty("visibility");
      return;
    }

    /** Lock the words to their visible resting state. The `.is-revealed` class hands the
     *  final state to CSS so clearing the inline styles can't re-clip the words. */
    function settle() {
      gsap.killTweensOf([title, ...words]);
      gsap.set([title, ...words], { clearProps: "all" });
      title.classList.add("is-revealed");
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Pre-hide the title, THEN reveal visibility so there is never a flash before the fade-in.
    if (!reduced) {
      gsap.set(title, { opacity: 0 });
      gsap.set(words, { opacity: 0 });
    }
    title.style.removeProperty("visibility");

    if (reduced) {
      settle();
      return;
    }

    function play(instant = false) {
      if (playedRef.current) return;
      playedRef.current = true;

      const tl = gsap.timeline({
        onComplete: settle,
        defaults: { ease: "power2.out", overwrite: "auto" },
      });

      tl.fromTo(
        title,
        { opacity: 0 },
        { opacity: 1, duration: instant ? 0.5 : 0.85 },
        0
      ).fromTo(
        words,
        { opacity: 0 },
        {
          opacity: 1,
          duration: instant ? 0.45 : 0.7,
          stagger: 0.12,
        },
        instant ? 0.08 : 0.18
      );
    }

    const loaderActive = () =>
      document.documentElement.classList.contains("roru-loading") ||
      document.documentElement.classList.contains("roru-preload");

    function onHero(event: Event) {
      const instant = (event as CustomEvent<{ instant?: boolean }>).detail?.instant;
      play(Boolean(instant));
    }
    window.addEventListener("roru:hero-animate", onHero as EventListener);

    // Play as soon as the intro loader is gone — don't depend solely on the (slower, sometimes
    // missed) home-reveal event chain, which is what caused the pop-then-replay flicker.
    let observer: MutationObserver | null = null;
    if (loaderActive()) {
      observer = new MutationObserver(() => {
        if (!loaderActive()) {
          observer?.disconnect();
          observer = null;
          play(true);
        }
      });
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
    } else {
      play(false);
    }

    /* Backstop: PLAY (never pop) if nothing else triggered the entrance. */
    const safety = window.setTimeout(() => play(false), 2500);

    return () => {
      window.removeEventListener("roru:hero-animate", onHero as EventListener);
      window.clearTimeout(safety);
      observer?.disconnect();
    };
  }, []);

  return (
    <section className="roru-hero roru-hero--ysl section-surface" ref={rootRef}>
      <div className="homepage-reveal roru-hero__reveal">
        <div className="roru-hero__media">
          <Image
            src={HOME_HERO_IMAGES.desktop}
            alt=""
            fill
            priority
            sizes="(max-width: 767px) 0px, 100vw"
            className="roru-hero__media-img roru-hero__media-img--desktop"
            fetchPriority="high"
            {...PREOPTIMIZED_IMAGE}
          />
          <Image
            src={HOME_HERO_IMAGES.mobile}
            alt=""
            fill
            priority
            sizes="(max-width: 767px) 100vw, 0px"
            className="roru-hero__media-img roru-hero__media-img--mobile"
            fetchPriority="high"
            {...PREOPTIMIZED_IMAGE}
          />
        </div>
        <div className="roru-hero__center">
          <h1 className="roru-hero__title">
            <TaglineLines lines={t.heroTagline} />
          </h1>
        </div>
      </div>
    </section>
  );
}
