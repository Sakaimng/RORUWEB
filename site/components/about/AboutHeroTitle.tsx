"use client";

import gsap from "gsap";
import { useLayoutEffect, useRef, useState } from "react";

function WordSpans({
  text,
  omitInterWordSpaces = false,
}: {
  text: string;
  omitInterWordSpaces?: boolean;
}) {
  const words = text.trim().split(/\s+/);
  return (
    <>
      {words.map((w, i) => (
        <span key={`${w}-${i}`}>
          {!omitInterWordSpaces && i > 0 ? " " : null}
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
  /**
   * When true, on narrow viewports each word stacks on its own line (no inter-word spaces in DOM).
   * Used on the about opera hero so “WHO / WE / ARE” reads clearly on mobile.
   */
  mobileWordStack?: boolean;
};

export function AboutHeroTitle({
  replaySignal = 0,
  mobileWordStack = false,
}: AboutHeroTitleProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const h1Ref = useRef<HTMLHeadingElement>(null);
  const [narrowViewport, setNarrowViewport] = useState(false);

  useLayoutEffect(() => {
    if (!mobileWordStack || typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setNarrowViewport(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [mobileWordStack]);

  const stackWords = mobileWordStack && narrowViewport;

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
  }, [replaySignal, stackWords]);

  return (
    <div ref={rootRef} className="roru-about-hero__title-wrap">
      <h1
        ref={h1Ref}
        className={
          stackWords
            ? "roru-about-hero__title roru-about-hero__title--stacked"
            : "roru-about-hero__title"
        }
      >
        <WordSpans text="WHO WE ARE" omitInterWordSpaces={stackWords} />
      </h1>
    </div>
  );
}
