"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";

const TITLE_A = "HONG KONG'S";
const TITLE_B_FIRST = "ORIGINAL";
const TITLE_B_REST = "HAND ROLL BAR";
const HIGHLIGHT =
  "ROLLED TO ORDER…SERVED AT ITS FRESHEST";
const BODY =
  "Hand rolls done right: premium ingredients, perfectly seasoned rice and nori flown in from Japan that's crisp to the bite. Grounded in tradition but never afraid to push boundaries, our menu is inspired by the flavours of our city and beyond. Take a seat and watch our chefs at work, as each roll is made to order and served fresh off the bar, ready to be enjoyed at its best.";

function WordSpans({ text }: { text: string }) {
  const words = text.split(/\s+/);
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

export function HeroSection() {
  const rootRef = useRef<HTMLElement>(null);
  const ranRef = useRef(false);

  useEffect(() => {
    function runAnimations() {
      if (ranRef.current) return;
      const root = rootRef.current;
      if (!root) return;

      const titles = root.querySelectorAll(".roru-hero__title");
      const text = root.querySelector(".roru-hero__text");
      if (!titles.length || !text) return;

      titles.forEach((title) => {
        gsap.set(title, { visibility: "visible" });
        const words = title.querySelectorAll(".word");
        gsap.set(words, { yPercent: 120, opacity: 0 });
        gsap.to(words, {
          yPercent: 0,
          opacity: 1,
          duration: 0.9,
          ease: "expo.out",
          stagger: 0.18,
        });
      });

      gsap.set(text, { visibility: "visible" });
      const highlightWords = text.querySelectorAll(".roru-hero__HighlightText .word");
      const bodyWords = text.querySelectorAll(".roru-hero__body .word");
      gsap.set([...highlightWords, ...bodyWords], { yPercent: 120, opacity: 0 });

      const tl = gsap.timeline();
      tl.to(highlightWords, {
        yPercent: 0,
        opacity: 1,
        duration: 0.8,
        ease: "expo.out",
        stagger: 0.08,
      }).to(
        bodyWords,
        {
          yPercent: 0,
          opacity: 1,
          duration: 0.8,
          ease: "expo.out",
        },
        "-=0.2"
      );

      ranRef.current = true;
    }

    function onHero(e: Event) {
      const ce = e as CustomEvent<{ instant?: boolean }>;
      if (ce.detail?.instant) {
        runAnimations();
      } else {
        setTimeout(() => runAnimations(), 80);
      }
    }

    window.addEventListener("roru:hero-animate", onHero as EventListener);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const root = rootRef.current;
      if (root) {
        root.querySelectorAll(".roru-hero__title, .roru-hero__text").forEach((el) => {
          (el as HTMLElement).style.visibility = "visible";
        });
      }
    }

    return () => window.removeEventListener("roru:hero-animate", onHero as EventListener);
  }, []);

  return (
    <section className="roru-hero section-surface text-[var(--text)]" ref={rootRef}>
      <div className="homepage-reveal roru-hero__reveal w-full min-h-0">
        <div className="roru-hero__grid grid min-h-[100vh] grid-cols-6 items-start gap-x-[9px] gap-y-[9px] max-md:gap-y-5 px-[2vw] pb-[2vw]">
          <div className="roru__heroWrap col-span-6">
            <h1 className="roru-hero__title m-0 text-[clamp(44px,7.2vw,116px)] font-extralight uppercase leading-[0.95] tracking-[-0.03em] text-[var(--accent)]">
              <WordSpans text={TITLE_A} />
            </h1>
            <h1 className="roru-hero__title m-0 text-[clamp(44px,7.2vw,116px)] font-extralight uppercase leading-[0.95] tracking-[-0.03em] text-[var(--accent)]">
              <WordSpans text={TITLE_B_FIRST} />
              <span className="hidden md:inline" aria-hidden="true">
                {" "}
              </span>
              <br className="md:hidden" aria-hidden="true" />
              <WordSpans text={TITLE_B_REST} />
            </h1>
          </div>
          <p className="roru-hero__text col-span-6 m-0 max-w-none text-[clamp(22px,3vw,62px)] font-extralight leading-[1.08] tracking-[0.03em] text-[var(--text)]">
            <span className="roru-hero__HighlightText font-semibold uppercase">
              <WordSpans text={HIGHLIGHT} />
            </span>
            <br />
            <span className="roru-hero__body">
              <WordSpans text={BODY} />
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
