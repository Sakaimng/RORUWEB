"use client";

import gsap from "gsap";
import { useLayoutEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n";

function WordSpans({ text }: { text: string }) {
  const words = text.trim().split(/\s+/);
  return (
    <>
      {words.map((w, i) => (
        <span key={`${w}-${i}`}>
          {i > 0 ? " " : null}
          <span className="word-wrap">
            <span className="word">{w}</span>
          </span>
        </span>
      ))}
    </>
  );
}

export type AboutHeroTitleProps = {
  /** Increment when the hero is shown again (e.g. scroll back) to replay the line animation without remounting */
  replaySignal?: number;
};

export function AboutHeroTitle({ replaySignal = 0 }: AboutHeroTitleProps) {
  const { t } = useI18n();
  const rootRef = useRef<HTMLDivElement>(null);
  const h1Ref = useRef<HTMLHeadingElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const heroTitle = h1Ref.current;

    if (!root || !heroTitle) return;

    const ctx = gsap.context(() => {
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      const words = gsap.utils.toArray<HTMLElement>(".word", heroTitle);

      gsap.killTweensOf([heroTitle, ...words]);

      gsap.set(heroTitle, {
        visibility: "visible",
      });

      if (reduceMotion) {
        gsap.set(words, {
          yPercent: 0,
          opacity: 1,
          clearProps: "transform",
        });
        return;
      }

      gsap.set(words, {
        yPercent: 120,
        opacity: 0,
        willChange: "transform, opacity",
      });

      gsap.to(words, {
        yPercent: 0,
        opacity: 1,
        duration: 0.9,
        ease: "expo.out",
        stagger: 0.12,
        delay: 0.08,
        overwrite: true,
        onComplete: () => {
          gsap.set(words, {
            clearProps: "willChange",
          });
        },
      });
    }, root);

    return () => ctx.revert();
  }, [replaySignal]);

  return (
    <div ref={rootRef} className="roru-about-hero__title-wrap">
      <h1 ref={h1Ref} className="roru-about-hero__title">
        <WordSpans text={t.about.heroTitle} />
      </h1>
    </div>
  );
}
