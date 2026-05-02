"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

type Props = { images: readonly string[] };

export function GallerySection({ images }: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const sticky = stickyRef.current;
    const track = trackRef.current;
    if (!section || !sticky || !track) return;

    const sectionEl = section;
    const stickyEl = sticky;
    const trackEl = track;

    const items = gsap.utils.toArray<HTMLElement>(
      section.querySelectorAll(".roru-gallery-item")
    );
    if (!items.length) return;

    let masterTween: gsap.core.Timeline | null = null;
    let debounceTimer: number | undefined;

    const viewport = () => Math.max(window.innerHeight, 1);
    const revealStep = () => viewport() * 0.75;

    function getThemeSurfaceColor(): string {
      const raw = getComputedStyle(document.documentElement)
        .getPropertyValue("--surface")
        .trim();
      if (raw) return raw;
      return "#f5f5f5";
    }

    function setupSectionHeight() {
      const totalSteps = Math.max(items.length, 1);
      const totalHeight = viewport() + revealStep() * totalSteps;
      sectionEl.style.height = `${Math.ceil(totalHeight)}px`;
    }

    function setInitialState() {
      gsap.set(trackEl, { clearProps: "all" });
      gsap.set(stickyEl, { backgroundColor: getThemeSurfaceColor() });

      const frameW = "min(100vw, calc(100dvh * 2 / 3))";
      const frameH = "100%";

      items.forEach((item, index) => {
        gsap.set(item, {
          position: "absolute",
          top: "50%",
          left: "50%",
          xPercent: -50,
          yPercent: -50,
          width: frameW,
          height: frameH,
          maxWidth: "100vw",
          maxHeight: "100%",
          margin: 0,
          clipPath: index === 0 ? "inset(0% 0% 0% 0%)" : "inset(100% 0% 0% 0%)",
          opacity: 1,
          scale: 1,
          zIndex: index + 1,
          overwrite: true,
        });
      });
    }

    function build() {
      setupSectionHeight();
      setInitialState();

      if (masterTween) {
        masterTween.scrollTrigger?.kill();
        masterTween.kill();
        masterTween = null;
      }

      const surfaceColor = getThemeSurfaceColor();

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: sectionEl,
          start: "top top",
          end: () => `+=${Math.max(revealStep() * items.length, 1)}`,
          pin: stickyEl,
          scrub: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      const segmentEnd = Math.max(0, items.length - 1);
      const outStart = segmentEnd === 0 ? 0.8 : Math.max(0, segmentEnd - 0.2);
      const fade = { duration: 0.2, ease: "power1.inOut" } as const;

      tl.to(stickyEl, { backgroundColor: "#000000", ...fade }, 0);
      tl.to(stickyEl, { backgroundColor: surfaceColor, ...fade }, outStart);

      items.forEach((item, index) => {
        if (index === 0) return;

        tl.to(
          item,
          {
            clipPath: "inset(0% 0% 0% 0%)",
            duration: 1,
          },
          index - 1
        );
      });

      masterTween = tl;
      ScrollTrigger.refresh();
    }

    function scheduleBuild() {
      window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        build();
      }, 180);
    }

    function waitForLayout() {
      if (document.readyState === "complete") {
        return Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        window.addEventListener("load", () => resolve(), { once: true });
      });
    }

    function waitForImages(container: HTMLElement) {
      const imgs = Array.from(container.querySelectorAll("img"));
      return Promise.all(
        imgs.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise<void>((resolve) => {
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => resolve(), { once: true });
          });
        })
      );
    }

    function refreshAfterReveal() {
      scheduleBuild();
    }

    waitForLayout()
      .then(() => waitForImages(sectionEl))
      .then(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            build();
          });
        });
      });

    window.addEventListener("roru:hero-animate", refreshAfterReveal);

    const mqMobile = window.matchMedia("(max-width: 767px)");

    function onBreakpointChange() {
      scheduleBuild();
    }

    function onOrientationChange() {
      window.setTimeout(scheduleBuild, 250);
    }

    window.addEventListener("resize", scheduleBuild);
    window.addEventListener("orientationchange", onOrientationChange);
    mqMobile.addEventListener("change", onBreakpointChange);

    return () => {
      window.clearTimeout(debounceTimer);
      mqMobile.removeEventListener("change", onBreakpointChange);
      window.removeEventListener("orientationchange", onOrientationChange);
      window.removeEventListener("resize", scheduleBuild);
      window.removeEventListener("roru:hero-animate", refreshAfterReveal);
      sectionEl.style.height = "";
      gsap.set(trackEl, { clearProps: "all" });
      gsap.set(stickyEl, { clearProps: "backgroundColor" });
      items.forEach((item) => gsap.set(item, { clearProps: "all" }));
      if (masterTween) {
        masterTween.scrollTrigger?.kill();
        masterTween.kill();
      }
    };
  }, [images.length]);

  return (
    <section
      className="roru-gallery-section section-surface relative"
      ref={sectionRef}
    >
      <div
        className="roru-gallery-sticky relative z-[2] h-[100svh] min-h-screen overflow-hidden bg-[var(--surface)]"
        ref={stickyRef}
      >
        <div
          className="roru-gallery-track relative h-full w-full"
          ref={trackRef}
        >
          {images.map((src, i) => (
            <figure
              key={src}
              className="roru-gallery-item absolute left-1/2 top-1/2 m-0 max-h-full overflow-hidden will-change-transform"
            >
              <Image
                src={src}
                alt=""
                width={800}
                height={1200}
                className="h-full w-full object-cover"
                sizes="(max-width: 767px) 100vw, min(100vw, 67dvh)"
                fetchPriority={i > 0 ? "low" : "auto"}
              />
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
