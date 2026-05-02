"use client";

import gsap from "gsap";
import Link from "next/link";
import { isMainPastFooterReveal } from "@/lib/home-entrance";
import { PATH_LINE_BOTTOM, PATH_LINE_TOP } from "@/lib/footer-logo-paths";
import { useLayoutEffect, useRef } from "react";

export function FooterLogo() {
  const rootRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const lineTopRef = useRef<SVGGElement>(null);
  const lineBottomRef = useRef<SVGGElement>(null);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    const lineTop = lineTopRef.current;
    const lineBottom = lineBottomRef.current;
    if (!svg || !lineTop || !lineBottom) return;

    const lines: [SVGGElement, SVGGElement] = [lineTop, lineBottom];

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      gsap.set(lines, { opacity: 1, y: 0, clearProps: "transform" });
      return;
    }

    const pageMain = document.getElementById("page-content");
    if (!pageMain) {
      gsap.set(lines, { opacity: 1, y: 0 });
      return;
    }

    gsap.set(lines, { opacity: 0, y: 22 });

    let played = false;
    let scrollTicking = false;

    function playReveal() {
      played = true;
      gsap.killTweensOf(lines);
      gsap.to(lines, {
        opacity: 1,
        y: 0,
        duration: 0.65,
        ease: "power3.out",
        stagger: 0.11,
      });
    }

    function checkFooterVisible() {
      if (played) return;
      if (isMainPastFooterReveal(pageMain)) {
        playReveal();
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onResize);
        return;
      }
      scrollTicking = false;
    }

    function onScroll() {
      if (!scrollTicking) {
        requestAnimationFrame(checkFooterVisible);
        scrollTicking = true;
      }
    }

    function onResize() {
      checkFooterVisible();
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    checkFooterVisible();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      gsap.killTweensOf(lines);
      gsap.set(lines, { opacity: 1, y: 0, clearProps: "transform" });
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="roru-footer-logo flex min-h-0 w-full min-w-0 flex-col items-stretch max-md:h-full md:h-auto md:items-start"
    >
      <Link href="/" className="roru-footer__logo-link" aria-label="RORUBARU home">
        <div className="roru-footer-logo__svg-wrap flex h-full min-h-0 w-full max-w-full shrink-0 items-stretch max-md:h-full md:h-auto">
          <svg
            ref={svgRef}
            className="roru-footer__logo-svg h-full max-h-full w-full max-w-full shrink-0 max-md:h-full md:h-auto md:max-h-[min(88vh,820px)]"
            viewBox="0 0 267 136"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
            preserveAspectRatio="xMinYMid meet"
          >
            <g ref={lineTopRef} className="roru-footer-logo__line">
              {PATH_LINE_TOP.map((d, i) => (
                <path key={`t-${i}`} d={d} fill="#F54500" />
              ))}
            </g>
            <g ref={lineBottomRef} className="roru-footer-logo__line">
              {PATH_LINE_BOTTOM.map((d, i) => (
                <path key={`b-${i}`} d={d} fill="#F54500" />
              ))}
            </g>
          </svg>
        </div>
      </Link>
    </div>
  );
}
