"use client";

import gsap from "gsap";
import Image from "next/image";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AboutHeroTitle } from "./AboutHeroTitle";
import { AboutSequenceMarquee } from "./AboutSequenceMarquee";
import { useI18n } from "@/lib/i18n";
import { SCROLL_TO_TOP_EVENT } from "@/lib/scroll-to-top";

/** Viewport width at which opera uses top horizontal gallery + bottom text stack */
const OPERA_MOBILE_MAX_PX = 767;

/* Discrete stepper feel — mirrors the home/events panel scroller (HomeYslScroll):
   one gesture = one scene change, then a lock until it settles. */
const ABOUT_STEP_LOCK_MS = 850;
const WHEEL_THRESHOLD = 18;
const TOUCH_THRESHOLD = 44;

type Item = { src: string; n: string; alt: string };
type StoryImages = { large: string; top: string; bottom: string };

export type AboutScrollScenesProps = {
  sequence: readonly Item[];
  storyImages: StoryImages;
};

/** Ask HomeYslScroll to step to the next/previous overlay panel (e.g. story → footer). */
function requestHomePanelStep(direction: 1 | -1) {
  window.dispatchEvent(
    new CustomEvent("roru:home-panel-step", { detail: { direction } }),
  );
}

function setTextPaneState(el: HTMLElement, visible: boolean, immediate = false) {
  gsap.killTweensOf(el);
  gsap.to(el, {
    opacity: visible ? 1 : 0,
    duration: immediate ? 0 : 0.42,
    ease: "power2.out",
    overwrite: true,
    onStart: () => {
      if (visible) {
        el.style.pointerEvents = "auto";
        el.style.visibility = "visible";
      }
    },
    onComplete: () => {
      el.style.pointerEvents = visible ? "auto" : "none";
      el.style.visibility = visible ? "visible" : "hidden";
    },
  });
}

function applyTextPaneOpacities(
  section: 0 | 1 | 2,
  heroT: HTMLElement,
  introT: HTMLElement,
  storyT: HTMLElement,
  immediate = false,
) {
  setTextPaneState(heroT, section === 0, immediate);
  setTextPaneState(introT, section === 1, immediate);
  setTextPaneState(storyT, section === 2, immediate);
}

function AboutOperaStoryLines() {
  const { t } = useI18n();
  return (
    <span className="about-opera-story__text">
      {t.about.story.map((line, i) => (
        <span key={i} className="about-opera-story__line">
          <span className="about-opera-story__line-inner">{line}</span>
        </span>
      ))}
    </span>
  );
}

function AboutIntroLineBlocks() {
  const { t } = useI18n();
  return (
    <div className="about-opera-intro__text">
      {t.about.intro.map((line, i) => (
        <div key={i} className="about-opera-intro__line">
          <div className="about-opera-intro__line-inner">{line}</div>
        </div>
      ))}
    </div>
  );
}

function AboutReducedMotionFallback({ sequence, storyImages }: AboutScrollScenesProps) {
  const { t } = useI18n();
  return (
    <>
      <section className="roru-about-hero">
        <div className="roru-about-hero__grid">
          <AboutSequenceMarquee items={sequence} />
          <AboutHeroTitle />
        </div>
      </section>
      <section className="roru-about-intro">
        <div className="roru-about-intro__grid">
          <div className="roru-about-intro__text-wrap">
            <h3 className="roru-about-intro__text">{t.about.intro.join(" ")}</h3>
          </div>
        </div>
      </section>
      <section className="roru-about-story roru-about-story--end">
        <div className="roru-about-story__grid">
          <div className="roru-about-story__masonry">
            <figure className="roru-about-story__image-block roru-about-story__image-block--large relative">
              <Image
                src={storyImages.large}
                alt="Story image 01"
                fill
                className="roru-about-story__image"
                sizes="(max-width: 768px) 100vw, (max-width: 991px) 100vw, 40vw"
              />
            </figure>
            <figure className="roru-about-story__image-block roru-about-story__image-block--top relative">
              <Image
                src={storyImages.top}
                alt="Story image 02"
                fill
                className="roru-about-story__image"
                sizes="(max-width: 768px) 100vw, (max-width: 991px) 100vw, 30vw"
              />
            </figure>
            <figure className="roru-about-story__image-block roru-about-story__image-block--bottom relative">
              <Image
                src={storyImages.bottom}
                alt="Story image 03"
                fill
                className="roru-about-story__image"
                sizes="(max-width: 768px) 100vw, (max-width: 991px) 100vw, 30vw"
              />
            </figure>
          </div>
          <div
            className="roru-about-story__content"
            style={{ paddingBottom: "clamp(1.5rem, 3vw, 3rem)" }}
          >
            <h2 className="roru-about-story__title">{t.about.story.join(" ")}</h2>
          </div>
        </div>
      </section>
    </>
  );
}

export function AboutScrollScenes({ sequence, storyImages }: AboutScrollScenesProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRootRef = useRef<HTMLDivElement>(null);
  const heroTextRef = useRef<HTMLDivElement>(null);
  const introTextRef = useRef<HTMLDivElement>(null);
  const storyTextRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState<0 | 1 | 2>(0);
  /** Increment when returning to hero so WHO WE ARE replays its word landing (see AboutHeroTitle). */
  const [heroLandingReplay, setHeroLandingReplay] = useState(0);
  const [galleryAxis, setGalleryAxis] = useState<"horizontal" | "vertical">("vertical");
  const sectionRef = useRef<0 | 1 | 2>(0);
  const [reduced, setReduced] = useState(false);
  const introInnersRef = useRef<HTMLDivElement[]>([]);
  const storyLineInnersRef = useRef<HTMLElement[]>([]);

  const galleryItems = useMemo((): readonly Item[] => {
    const extras: Item[] = [
      { src: storyImages.large, n: "", alt: "Story image 01" },
      { src: storyImages.top, n: "", alt: "Story image 02" },
      { src: storyImages.bottom, n: "", alt: "Story image 03" },
    ];
    return [...sequence, ...extras];
  }, [sequence, storyImages]);

  const syncRefsToSection = useCallback((s: 0 | 1 | 2) => {
    sectionRef.current = s;
    setActiveSection(s);
  }, []);

  useLayoutEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(max-width: ${OPERA_MOBILE_MAX_PX}px)`);
    const sync = () => {
      setGalleryAxis(mq.matches ? "horizontal" : "vertical");
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const refreshDomRefs = useCallback(() => {
    const introT = introTextRef.current;
    const storyT = storyTextRef.current;
    if (introT) {
      introInnersRef.current = Array.from(
        introT.querySelectorAll<HTMLDivElement>(".about-opera-intro__line-inner") ?? [],
      );
    }
    if (storyT) {
      storyLineInnersRef.current = Array.from(
        storyT.querySelectorAll<HTMLElement>(".about-opera-story__line-inner") ?? [],
      );
    }
  }, []);

  const applyTextOpacitiesForSection = useCallback(
    (s: 0 | 1 | 2, immediate = false) => {
      const h = heroTextRef.current;
      const i = introTextRef.current;
      const t = storyTextRef.current;
      if (h && i && t) {
        applyTextPaneOpacities(s, h, i, t, immediate);
      }
    },
    [],
  );

  /** Crossfade to a scene. The stepper owns the gesture lock; this only swaps text. */
  const goToSection = useCallback(
    (next: 0 | 1 | 2) => {
      const from = sectionRef.current;
      if (from === next) return;
      if (next === 0 && from !== 0) {
        setHeroLandingReplay((n) => n + 1);
      }
      syncRefsToSection(next);
      applyTextOpacitiesForSection(next);
    },
    [syncRefsToSection, applyTextOpacitiesForSection],
  );

  useLayoutEffect(() => {
    if (reduced) return;
    refreshDomRefs();
    const inners = introInnersRef.current;
    const lines = storyLineInnersRef.current;
    if (inners.length) gsap.set(inners, { yPercent: 100, opacity: 1 });
    if (lines.length) gsap.set(lines, { yPercent: 100, opacity: 1 });
  }, [reduced, refreshDomRefs]);

  /* Discrete scene stepper: one wheel/touch/key gesture advances exactly one scene
     (hero → intro → story), then locks until it settles — the same behaviour as the
     home & events panel scroller. At the story scene a further scroll asks
     HomeYslScroll to step to the footer panel; scrolling back up reverses it. The
     gallery stays put; only the text crossfades. */
  useEffect(() => {
    if (reduced) return;
    const track = trackRef.current;
    if (!track) return;

    refreshDomRefs();
    applyTextOpacitiesForSection(0, true);
    syncRefsToSection(0);

    const panelEl = () => track.closest<HTMLElement>(".roru-home-overlay-panel");
    const aboutActive = () => panelEl()?.classList.contains("is-active") ?? false;

    let locked = false;
    let lockTimer: number | null = null;
    let touchStartY: number | null = null;

    const lock = () => {
      locked = true;
      if (lockTimer) clearTimeout(lockTimer);
      lockTimer = window.setTimeout(() => {
        locked = false;
      }, ABOUT_STEP_LOCK_MS);
    };

    const step = (dir: 1 | -1) => {
      if (locked) return;
      const s = sectionRef.current;
      if (dir === 1) {
        if (s < 2) {
          goToSection((s + 1) as 0 | 1 | 2);
          lock();
        } else {
          // Last scene → hand off to the next overlay panel (footer).
          requestHomePanelStep(1);
          lock();
        }
      } else if (s > 0) {
        goToSection((s - 1) as 0 | 1 | 2);
        lock();
      }
      // dir === -1 at hero (s === 0): nothing above the first panel.
    };

    const onWheel = (e: WheelEvent) => {
      if (!aboutActive()) return;
      if (Math.abs(e.deltaY) < WHEEL_THRESHOLD) return;
      // Own the gesture so the panel scroller doesn't also fire.
      e.preventDefault();
      e.stopImmediatePropagation();
      step(e.deltaY > 0 ? 1 : -1);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (aboutActive()) touchStartY = e.touches[0]?.clientY ?? null;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (aboutActive() && touchStartY != null) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      const startY = touchStartY;
      touchStartY = null;
      if (!aboutActive() || startY == null) return;
      const endY = e.changedTouches[0]?.clientY ?? null;
      if (endY == null) return;
      const delta = startY - endY;
      if (Math.abs(delta) < TOUCH_THRESHOLD) return;
      e.stopImmediatePropagation();
      step(delta > 0 ? 1 : -1);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (!aboutActive() || e.defaultPrevented) return;
      if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        step(1);
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        step(-1);
      }
    };

    const capture = { capture: true } as AddEventListenerOptions;
    window.addEventListener("wheel", onWheel, { passive: false, capture: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true, capture: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false, capture: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true, capture: true });
    window.addEventListener("keydown", onKeyDown);

    return () => {
      if (lockTimer) clearTimeout(lockTimer);
      window.removeEventListener("wheel", onWheel, capture);
      window.removeEventListener("touchstart", onTouchStart, capture);
      window.removeEventListener("touchmove", onTouchMove, capture);
      window.removeEventListener("touchend", onTouchEnd, capture);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [reduced, refreshDomRefs, goToSection, applyTextOpacitiesForSection, syncRefsToSection]);

  useEffect(() => {
    function onScrollToTop() {
      if (sectionRef.current === 0) return;
      setHeroLandingReplay((n) => n + 1);
      syncRefsToSection(0);
      applyTextOpacitiesForSection(0, true);
    }
    window.addEventListener(SCROLL_TO_TOP_EVENT, onScrollToTop);
    return () => window.removeEventListener(SCROLL_TO_TOP_EVENT, onScrollToTop);
  }, [syncRefsToSection, applyTextOpacitiesForSection]);

  useEffect(() => {
    if (reduced) return;
    if (activeSection === 1) return;
    const introT = introTextRef.current;
    if (!introT) return;
    const inners = Array.from(
      introT.querySelectorAll<HTMLDivElement>(".about-opera-intro__line-inner") ?? [],
    );
    introInnersRef.current = inners;
    if (inners.length) {
      gsap.killTweensOf(inners);
      gsap.set(inners, { yPercent: 100, opacity: 1 });
    }
  }, [activeSection, reduced]);

  useEffect(() => {
    if (reduced) return;
    if (activeSection !== 1) return;
    const introT = introTextRef.current;
    if (!introT) return;
    const inners = Array.from(
      introT.querySelectorAll<HTMLDivElement>(".about-opera-intro__line-inner") ?? [],
    );
    introInnersRef.current = inners;
    if (!inners.length) return;
    gsap.killTweensOf(inners);
    gsap.set(inners, { yPercent: 100, opacity: 1 });
    gsap.fromTo(
      inners,
      { yPercent: 100, opacity: 1 },
      {
        yPercent: 0,
        duration: 0.88,
        ease: "power3.out",
        stagger: 0.06,
        overwrite: false,
      },
    );
  }, [activeSection, reduced]);

  useEffect(() => {
    if (reduced) return;
    if (activeSection === 2) return;
    const storyT = storyTextRef.current;
    if (!storyT) return;
    const lines = Array.from(
      storyT.querySelectorAll<HTMLElement>(".about-opera-story__line-inner") ?? [],
    );
    storyLineInnersRef.current = lines;
    if (lines.length) {
      gsap.killTweensOf(lines);
      gsap.set(lines, { yPercent: 100, opacity: 1 });
    }
  }, [activeSection, reduced]);

  useEffect(() => {
    if (reduced) return;
    if (activeSection !== 2) return;
    const storyT = storyTextRef.current;
    if (!storyT) return;
    const lines = Array.from(
      storyT.querySelectorAll<HTMLElement>(".about-opera-story__line-inner") ?? [],
    );
    if (!lines.length) return;
    storyLineInnersRef.current = lines;
    gsap.killTweensOf(lines);
    gsap.set(lines, { yPercent: 100, opacity: 1 });
    gsap.fromTo(
      lines,
      { yPercent: 100, opacity: 1 },
      {
        yPercent: 0,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.08,
        overwrite: false,
      },
    );
  }, [activeSection, reduced]);

  if (reduced) {
    return <AboutReducedMotionFallback sequence={sequence} storyImages={storyImages} />;
  }

  return (
    <section className="about-opera-section section-surface" aria-label="About Roru Baru">
      <div className="about-opera-track" id="about-opera-track" ref={trackRef}>
        <div className="about-opera-sticky">
          <div
            ref={stageRootRef}
            className="about-opera-stage about-opera-stage--unified"
            aria-label="About story in three scenes"
          >
            <div
              ref={heroTextRef}
              className="about-opera-text-pane about-opera-text-pane--hero"
            >
              <AboutHeroTitle replaySignal={heroLandingReplay} />
            </div>
            <div className="about-opera-layout">
              <aside className="about-opera-gallery-col">
                <AboutSequenceMarquee items={galleryItems} axis={galleryAxis} />
              </aside>
              <div className="about-opera-text-col">
                <div
                  ref={introTextRef}
                  className="about-opera-text-pane about-opera-text-pane--intro"
                  style={{ opacity: 0, pointerEvents: "none", visibility: "hidden" }}
                >
                  <div className="about-opera-intro about-opera-intro--inline">
                    <AboutIntroLineBlocks />
                  </div>
                </div>
                <div
                  ref={storyTextRef}
                  className="about-opera-text-pane about-opera-text-pane--story"
                  style={{ opacity: 0, pointerEvents: "none", visibility: "hidden" }}
                >
                  <div className="about-opera-story-text-only">
                    <h2 className="roru-about-story__title about-opera-story__title">
                      <AboutOperaStoryLines />
                    </h2>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
