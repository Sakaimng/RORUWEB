"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AboutHeroTitle } from "./AboutHeroTitle";
import { AboutSequenceMarquee } from "./AboutSequenceMarquee";

gsap.registerPlugin(ScrollTrigger);

/** Min track height ≈ 9× viewport (px); long runway so sticky does not release early */
const OPERA_TRACK_MIN_VIEWPORTS = 9;
/**
 * While on hero / intro, cap document scroll into the track so trackpad flings cannot
 * burn through the sticky parent before wheel steps reach the story pane.
 */
const OPERA_SCROLL_CAP_HERO_INTRO_VH = 1.35;
/** On story before exit, allow some native scroll but stay away from the track end */
const OPERA_SCROLL_CAP_STORY_PRE_EXIT_VH = 6;
const OPERA_SCROLL_END_MARGIN_VH = 2.5;

/** Viewport width at which opera uses top horizontal gallery + bottom text stack */
const OPERA_MOBILE_MAX_PX = 767;

const INTRO_LINE_BLOCKS: string[] = [
  "Roru Baru was born out of a love for hand rolls and the craft behind them. As Hong Kong's original hand roll bar we wanted to bring a new energy to the city,",
  "inspired by the pace and spirit of Tokyo's dining culture. Our rolls are made to order and served fresh off the bar, always ready to be enjoyed at their best.",
  "The details are at the heart of what we do. Warm rice, crisp nori flown in from Japan and seafood dressed with care.",
  "The menu is focused, but we like to play with flavours inspired by local dishes and our travels abroad.",
];

const STORY_LINE_BLOCKS: string[] = [
  "The vibe changes with the day.",
  "Lunchtime is lively and perfect for a quick bite between meetings.",
  "In the evening, the lights shift and the music goes up a notch. The space becomes somewhere to linger, enjoy a few tipples and soak in the energy.",
  "Whether you join us for a quick lunch, relaxed dinner or a draught sake or two, you'll always be part of the action at our counter.",
];

const STORY_TEXT = STORY_LINE_BLOCKS.join(" ");

type Item = { src: string; n: string; alt: string };
type StoryImages = { large: string; top: string; bottom: string };

export type AboutScrollScenesProps = {
  sequence: readonly Item[];
  storyImages: StoryImages;
};

function setTextPaneState(
  el: HTMLElement,
  visible: boolean,
  immediate = false,
) {
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
  return (
    <span className="about-opera-story__text">
      {STORY_LINE_BLOCKS.map((line, i) => (
        <span key={i} className="about-opera-story__line">
          <span className="about-opera-story__line-inner">{line}</span>
        </span>
      ))}
    </span>
  );
}

function AboutIntroLineBlocks() {
  return (
    <div className="about-opera-intro__text">
      {INTRO_LINE_BLOCKS.map((line, i) => (
        <div key={i} className="about-opera-intro__line">
          <div className="about-opera-intro__line-inner">{line}</div>
        </div>
      ))}
    </div>
  );
}

function AboutReducedMotionFallback({ sequence, storyImages }: AboutScrollScenesProps) {
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
            <h3 className="roru-about-intro__text">{INTRO_LINE_BLOCKS.join(" ")}</h3>
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
            <h2 className="roru-about-story__title">{STORY_TEXT}</h2>
          </div>
        </div>
      </section>
    </>
  );
}

function trackDocTop(track: HTMLElement): number {
  return window.scrollY + track.getBoundingClientRect().top;
}

function isInTrackWindow(track: HTMLElement, y: number, padPx = 4): boolean {
  const h = window.innerHeight;
  const start = trackDocTop(track);
  const end = start + track.offsetHeight - h;
  return y >= start - padPx && y <= end + padPx;
}

const INTERNAL_STEP_LOCK_MS = 520;
const MIN_WHEEL_DELTA = 16;
const WHEEL_IDLE_MS = 620;
const SECTION_EXIT_FADE_MS = 420;

function bumpWheelIdle(untilRef: { current: number }) {
  untilRef.current = Date.now() + WHEEL_IDLE_MS;
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
  const sectionExitHiddenRef = useRef(false);
  const wheelIdleUntilRef = useRef(0);
  const lockScrollRef = useRef(false);
  const animatingToRef = useRef<0 | 1 | 2 | null>(null);
  const stepLockTimerRef = useRef<number | null>(null);
  const introInnersRef = useRef<HTMLDivElement[]>([]);
  const storyLineInnersRef = useRef<HTMLElement[]>([]);
  const scrollClampRafRef = useRef<number | null>(null);

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

  useEffect(() => {
    if (reduced) return;
    ScrollTrigger.refresh();
  }, [galleryAxis, reduced]);

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

  const finishSettleTo = useCallback((t: 0 | 1 | 2) => {
    animatingToRef.current = null;
    lockScrollRef.current = false;
    bumpWheelIdle(wheelIdleUntilRef);
    syncRefsToSection(t);
    // Opacity is already driven by goToSection; do not tween again here — a second pass
    // after INTERNAL_STEP_LOCK_MS was killing/overwriting fades (especially wheel-up).
  }, [syncRefsToSection]);

  const restoreSectionAfterExit = useCallback(() => {
    const stage = stageRootRef.current;
    if (!stage) return;
    sectionExitHiddenRef.current = false;
    gsap.killTweensOf(stage);
    stage.style.visibility = "visible";
    stage.style.pointerEvents = "auto";
    gsap.set(stage, { opacity: 0 });
    syncRefsToSection(2);
    applyTextOpacitiesForSection(2, true);
    refreshDomRefs();
    bumpWheelIdle(wheelIdleUntilRef);
    gsap.to(stage, {
      opacity: 1,
      duration: SECTION_EXIT_FADE_MS / 1000,
      ease: "power2.out",
      overwrite: true,
    });
  }, [applyTextOpacitiesForSection, refreshDomRefs, syncRefsToSection]);

  const goToSection = useCallback(
    (next: 0 | 1 | 2) => {
      if (lockScrollRef.current) return;
      const from = sectionRef.current;
      if (from === next) return;

      if (next === 0 && from !== 0) {
        setHeroLandingReplay((n) => n + 1);
      }

      animatingToRef.current = next;
      lockScrollRef.current = true;

      syncRefsToSection(next);
      applyTextOpacitiesForSection(next);

      if (stepLockTimerRef.current) clearTimeout(stepLockTimerRef.current);

      stepLockTimerRef.current = window.setTimeout(() => {
        stepLockTimerRef.current = null;
        finishSettleTo(next);
      }, INTERNAL_STEP_LOCK_MS);
    },
    [syncRefsToSection, applyTextOpacitiesForSection, finishSettleTo],
  );

  useLayoutEffect(() => {
    if (reduced) return;
    const track = trackRef.current;
    if (!track) return;
    const h = window.innerHeight;
    const px = Math.max(Math.round(h * OPERA_TRACK_MIN_VIEWPORTS), 2400);
    track.style.minHeight = `${px}px`;
  }, [reduced]);

  useLayoutEffect(() => {
    if (reduced) return;
    refreshDomRefs();
    const inners = introInnersRef.current;
    const lines = storyLineInnersRef.current;
    if (inners.length) gsap.set(inners, { yPercent: 100, opacity: 1 });
    if (lines.length) gsap.set(lines, { yPercent: 100, opacity: 1 });
  }, [reduced, refreshDomRefs]);

  useEffect(() => {
    if (reduced) return;
    refreshDomRefs();
    applyTextOpacitiesForSection(0, true);
    syncRefsToSection(0);
  }, [reduced, refreshDomRefs, applyTextOpacitiesForSection, syncRefsToSection]);

  useEffect(() => {
    if (reduced) return;
    const track = trackRef.current;
    const stage = stageRootRef.current;
    if (!track || !stage) return;

    refreshDomRefs();

    const syncTrackMinHeight = () => {
      const h = window.innerHeight;
      const px = Math.max(Math.round(h * OPERA_TRACK_MIN_VIEWPORTS), 2400);
      track.style.minHeight = `${px}px`;
    };
    syncTrackMinHeight();

    const clampScrollIntoOpera = () => {
      if (sectionExitHiddenRef.current) return;
      const h = window.innerHeight;
      if (h < 1) return;
      const top = trackDocTop(track);
      const y = window.scrollY;
      const maxEnd = top + track.offsetHeight - h;
      const s = sectionRef.current;
      if (y < top - h * 0.2 || y > maxEnd + h * 0.25) return;

      let capY = Number.POSITIVE_INFINITY;
      if (s < 2) {
        capY = top + OPERA_SCROLL_CAP_HERO_INTRO_VH * h;
      } else {
        const storyCap = top + OPERA_SCROLL_CAP_STORY_PRE_EXIT_VH * h;
        const endCap = maxEnd - OPERA_SCROLL_END_MARGIN_VH * h;
        capY = Math.min(storyCap, Math.max(top + 0.6 * h, endCap));
      }

      if (y > capY + 1) {
        window.scrollTo({ top: Math.max(top, capY), behavior: "auto" });
      }
    };

    const scheduleScrollClamp = () => {
      if (scrollClampRafRef.current != null) return;
      scrollClampRafRef.current = requestAnimationFrame(() => {
        scrollClampRafRef.current = null;
        clampScrollIntoOpera();
      });
    };

    const onScroll = () => {
      const y = window.scrollY;
      const h = window.innerHeight;
      const end = trackDocTop(track) + track.offsetHeight - h;

      scheduleScrollClamp();

      if (!isInTrackWindow(track, y, h * 0.12)) {
        lockScrollRef.current = false;
        animatingToRef.current = null;
      }

      if (sectionExitHiddenRef.current && y < end - h * 0.06) {
        restoreSectionAfterExit();
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (!isInTrackWindow(track, window.scrollY, window.innerHeight * 0.08)) return;

      const s = sectionRef.current;
      const delta = e.deltaY;
      const goingDown = delta > 0;

      if (Math.abs(delta) < MIN_WHEEL_DELTA) return;

      if (Date.now() < wheelIdleUntilRef.current) {
        e.preventDefault();
        return;
      }

      if (lockScrollRef.current || animatingToRef.current != null) {
        e.preventDefault();
        return;
      }

      if (!goingDown && s === 2 && sectionExitHiddenRef.current) {
        e.preventDefault();
        restoreSectionAfterExit();
        bumpWheelIdle(wheelIdleUntilRef);
        return;
      }

      if (goingDown && s < 2) {
        e.preventDefault();
        goToSection((s + 1) as 0 | 1 | 2);
        return;
      }

      if (!goingDown && s > 0) {
        e.preventDefault();
        goToSection((s - 1) as 0 | 1 | 2);
        return;
      }

      if (goingDown && s === 2) {
        if (sectionExitHiddenRef.current) return;

        const st = stageRootRef.current;
        if (!st) return;

        e.preventDefault();
        lockScrollRef.current = true;
        animatingToRef.current = 2;
        gsap.killTweensOf(st);
        gsap.to(st, {
          opacity: 0,
          duration: SECTION_EXIT_FADE_MS / 1000,
          ease: "power2.out",
          overwrite: true,
          onComplete: () => {
            st.style.pointerEvents = "none";
            st.style.visibility = "hidden";
            sectionExitHiddenRef.current = true;
            const exitY = trackDocTop(track) + track.offsetHeight - window.innerHeight + 2;
            window.scrollTo({ top: exitY, behavior: "auto" });
            animatingToRef.current = null;
            lockScrollRef.current = false;
            bumpWheelIdle(wheelIdleUntilRef);
          },
        });
        return;
      }

      if (!goingDown && s === 0) {
        return;
      }
    };

    const ro = new ResizeObserver(() => {
      syncTrackMinHeight();
      ScrollTrigger.refresh();
      refreshDomRefs();
      applyTextOpacitiesForSection(sectionRef.current, true);
      scheduleScrollClamp();
    });
    ro.observe(track);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: false, capture: true });

    const onR = () => {
      syncTrackMinHeight();
      ScrollTrigger.refresh();
      scheduleScrollClamp();
    };
    window.addEventListener("load", onR, { once: true });
    window.addEventListener("resize", onR);
    onScroll();

    return () => {
      if (scrollClampRafRef.current != null) {
        cancelAnimationFrame(scrollClampRafRef.current);
        scrollClampRafRef.current = null;
      }
      if (stepLockTimerRef.current) clearTimeout(stepLockTimerRef.current);
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", onWheel, { capture: true } as AddEventListenerOptions);
      window.removeEventListener("load", onR);
      window.removeEventListener("resize", onR);
    };
  }, [reduced, refreshDomRefs, goToSection, applyTextOpacitiesForSection, syncRefsToSection, restoreSectionAfterExit]);

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
            <div className="about-opera-layout">
              <aside className="about-opera-gallery-col">
                <AboutSequenceMarquee items={galleryItems} axis={galleryAxis} />
              </aside>
              <div className="about-opera-text-col">
                <div
                  ref={heroTextRef}
                  className="about-opera-text-pane about-opera-text-pane--hero"
                >
                  <AboutHeroTitle replaySignal={heroLandingReplay} mobileWordStack />
                </div>
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
