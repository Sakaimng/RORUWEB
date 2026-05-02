"use client";

import gsap from "gsap";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { runPostLoaderSequence } from "@/lib/home-entrance";
import {
  INTERNAL_NAV_KEY,
  PAGE_TRANSITION_START_EVENT,
  TRANSITION_PENDING_KEY,
} from "@/lib/roru-session";

const COLUMN_COUNT = 24;
const DURATION_IN_MIN = 0.28;
const DURATION_IN_MAX = 1.12;
const DURATION_OUT_MIN = 0.24;
const DURATION_OUT_MAX = 1.02;
/** Unblocks page + (on `/`) home entrance while columns are still moving. */
const REVEAL_OVERLAP_S = 0.3;
const EASE_MOTION = "expo.out" as const;

type Pole = "top" | "bottom";

function fract(n: number) {
  return n - Math.floor(n);
}

/** Per-column 0..1, spread out so neighbors feel more different. */
function columnSpeedT(index: number, salt: number) {
  const i = index;
  return fract(
    i * 0.6180339887 * salt +
      fract(i * i * 0.0073 * salt) +
      (i % 5) * 0.017 * salt +
      Math.sin((i + 2) * 1.827 * salt) * 0.37 +
      Math.sin((i + 1) * 4.2 + salt) * 0.28 +
      Math.cos(i * 0.91 * salt) * 0.22
  );
}

function columnDurationIn(index: number) {
  const t = columnSpeedT(index, 1.31);
  return DURATION_IN_MIN + t * (DURATION_IN_MAX - DURATION_IN_MIN);
}

function columnDurationOut(index: number) {
  const t = columnSpeedT(index, 2.17);
  return DURATION_OUT_MIN + t * (DURATION_OUT_MAX - DURATION_OUT_MIN);
}

function getColParts(col: HTMLElement) {
  const fill = col.querySelector<HTMLElement>(".roru-page-transition__col-fill");
  const edgeL = col.querySelector<HTMLElement>(".roru-page-transition__col-edge--left");
  const edgeR = col.querySelector<HTMLElement>(".roru-page-transition__col-edge--right");
  if (!fill || !edgeL || !edgeR) return null;
  return { fill, edgeL, edgeR, edges: [edgeL, edgeR] as HTMLElement[] };
}

function setPoleTransformOrigin(els: HTMLElement[], pole: Pole) {
  const o = pole === "top" ? "50% 0%" : "50% 100%";
  gsap.set(els, { transformOrigin: o, force3D: true });
}

function killColumnTweens(cols: HTMLElement[]) {
  cols.forEach((c) => {
    const p = getColParts(c);
    if (p) {
      gsap.killTweensOf([c, p.fill, p.edgeL, p.edgeR]);
    } else {
      gsap.killTweensOf(c);
    }
  });
}

function setColumnsVisual(cols: HTMLElement[], state: "covered" | "off") {
  for (const c of cols) {
    const p = getColParts(c);
    if (!p) continue;
    const pole = c.dataset.pole === "top" ? "top" : "bottom";
    setPoleTransformOrigin([p.fill, p.edgeL, p.edgeR], pole);
    if (state === "covered") {
      gsap.set(c, { yPercent: 0, force3D: true });
      gsap.set([p.fill, p.edgeL, p.edgeR], {
        scaleY: 1,
        force3D: true,
      });
    } else {
      const y = pole === "top" ? -100 : 100;
      gsap.set(c, { yPercent: y, force3D: true });
      gsap.set([p.fill, p.edgeL, p.edgeR], {
        scaleY: 0,
        force3D: true,
      });
    }
  }
}

function buildColEnterTl(col: HTMLElement) {
  const p = getColParts(col);
  if (!p) {
    return gsap.timeline();
  }
  const idx = Number(col.dataset.index ?? 0);
  const pole = (col.dataset.pole === "top" ? "top" : "bottom") as Pole;
  setPoleTransformOrigin([p.fill, p.edgeL, p.edgeR], pole);
  gsap.set([p.fill, p.edgeL, p.edgeR], { scaleY: 0, force3D: true });
  const dur = columnDurationIn(idx);
  const edgeDur = Math.min(0.32, Math.max(0.14, dur * 0.3));
  const fillDelay = edgeDur * 0.42;
  const fillDur = Math.max(0.18, Math.min(dur * 0.62, Math.max(0, dur - fillDelay - 0.02)));

  const tl = gsap.timeline();
  tl.to(
    col,
    { yPercent: 0, duration: dur, ease: EASE_MOTION, force3D: true },
    0
  );
  tl.to(
    p.edges,
    {
      scaleY: 1,
      duration: edgeDur,
      ease: "power2.out",
      force3D: true,
    },
    0
  );
  tl.to(
    p.fill,
    {
      scaleY: 1,
      duration: fillDur,
      ease: "power2.out",
      force3D: true,
    },
    fillDelay
  );
  return tl;
}

function buildColExitTl(col: HTMLElement) {
  const p = getColParts(col);
  if (!p) {
    return gsap.timeline();
  }
  const idx = Number(col.dataset.index ?? 0);
  const pole = (col.dataset.pole === "top" ? "top" : "bottom") as Pole;
  setPoleTransformOrigin([p.fill, p.edgeL, p.edgeR], pole);
  const dur = columnDurationOut(idx);
  const toY = pole === "top" ? -100 : 100;
  const fillOutDur = Math.max(0.1, Math.min(0.36, dur * 0.32));
  const edgeStart = fillOutDur * 0.5;
  const edgeOutDur = Math.max(0.1, Math.min(0.3, dur * 0.26));

  const tl = gsap.timeline();
  tl.to(
    col,
    { yPercent: toY, duration: dur, ease: EASE_MOTION, force3D: true },
    0
  );
  tl.to(
    p.fill,
    {
      scaleY: 0,
      duration: fillOutDur,
      ease: "power2.in",
      force3D: true,
    },
    0
  );
  tl.to(
    p.edges,
    {
      scaleY: 0,
      duration: edgeOutDur,
      ease: "power2.in",
      force3D: true,
    },
    edgeStart
  );
  return tl;
}

export function PageTransition() {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const overlayRef = useRef<HTMLDivElement>(null);
  const isTransitioning = useRef(false);

  useEffect(() => {
    isTransitioning.current = false;
  }, [pathname]);

  useEffect(() => {
    const maybeRoot = overlayRef.current;
    if (!maybeRoot) return;
    const root: HTMLDivElement = maybeRoot;

    function isPendingState() {
      try {
        return sessionStorage.getItem(TRANSITION_PENDING_KEY) === "1";
      } catch {
        return false;
      }
    }

    function buildColumns() {
      root.innerHTML = "";
      const track = document.createElement("div");
      track.className = "roru-page-transition__track";
      const frag = document.createDocumentFragment();
      for (let i = 0; i < COLUMN_COUNT; i++) {
        const col = document.createElement("div");
        col.className = "roru-page-transition__col";
        col.dataset.index = String(i);
        col.dataset.pole = i % 2 === 0 ? "top" : "bottom";

        const fill = document.createElement("div");
        fill.className = "roru-page-transition__col-fill";

        const left = document.createElement("div");
        left.className =
          "roru-page-transition__col-edge roru-page-transition__col-edge--left";
        const right = document.createElement("div");
        right.className =
          "roru-page-transition__col-edge roru-page-transition__col-edge--right";

        col.appendChild(fill);
        col.appendChild(left);
        col.appendChild(right);
        frag.appendChild(col);
      }
      track.appendChild(frag);
      root.appendChild(track);
    }

    function getColumns() {
      return Array.from(
        root.querySelectorAll<HTMLElement>(".roru-page-transition__col")
      );
    }

    function showOverlay() {
      root.classList.add("is-active");
    }

    function hideOverlay() {
      root.classList.remove("is-active");
      document.documentElement.classList.remove("roru-transition-pending");
    }

    function revealPageContent() {
      document
        .querySelectorAll("body > *:not(#roru-page-transition)")
        .forEach((el) => {
          (el as HTMLElement).style.removeProperty("visibility");
        });
    }

    function setColumnsCovered() {
      const cols = getColumns();
      killColumnTweens(cols);
      setColumnsVisual(cols, "covered");
    }

    function setColumnsOffscreen() {
      const cols = getColumns();
      killColumnTweens(cols);
      setColumnsVisual(cols, "off");
    }

    function transitionIn(href: string) {
      if (isTransitioning.current) return;
      isTransitioning.current = true;
      window.dispatchEvent(new CustomEvent(PAGE_TRANSITION_START_EVENT));
      setColumnsOffscreen();
      showOverlay();
      const cols = getColumns();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const master = gsap.timeline({
            onComplete: () => {
              try {
                sessionStorage.setItem(TRANSITION_PENDING_KEY, "1");
                sessionStorage.setItem(INTERNAL_NAV_KEY, "1");
              } catch {
                /* ignore */
              }
              router.push(href);
            },
          });
          cols.forEach((col) => {
            master.add(buildColEnterTl(col), 0);
          });
        });
      });
    }

    try {
      if (sessionStorage.getItem(TRANSITION_PENDING_KEY) === "1") {
        document.documentElement.classList.add("roru-transition-pending");
      }
    } catch {
      /* ignore */
    }

    buildColumns();

    if (isPendingState()) {
      setColumnsCovered();
      showOverlay();
    } else {
      setColumnsOffscreen();
      hideOverlay();
      revealPageContent();
    }

    function onClick(e: MouseEvent) {
      const link = (e.target as Element | null)?.closest("a[href]");
      if (!link) return;
      const href = link.getAttribute("href");
      if (!href) return;
      if (
        link.getAttribute("target") === "_blank" ||
        link.hasAttribute("download") ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("javascript:")
      ) {
        return;
      }
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return;

      const nextLoc = `${url.pathname}${url.search}${url.hash}`;
      const here = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (nextLoc === here) return;
      if (isTransitioning.current) return;

      e.preventDefault();
      e.stopPropagation();
      transitionIn(nextLoc);
    }

    document.addEventListener("click", onClick, true);

    function onResize() {
      const pending = isPendingState();
      buildColumns();
      if (pending) {
        setColumnsCovered();
        showOverlay();
      } else {
        setColumnsOffscreen();
        hideOverlay();
        revealPageContent();
      }
    }

    window.addEventListener("resize", onResize);

    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("resize", onResize);
    };
  }, [router]);

  useEffect(() => {
    let pending = false;
    try {
      pending = sessionStorage.getItem(TRANSITION_PENDING_KEY) === "1";
    } catch {
      return;
    }
    if (!pending) return;

    const maybeOverlay = overlayRef.current;
    if (!maybeOverlay) return;
    const overlay: HTMLDivElement = maybeOverlay;

    function getColumns() {
      return Array.from(
        overlay.querySelectorAll<HTMLElement>(".roru-page-transition__col")
      );
    }

    function hideOverlay() {
      overlay.classList.remove("is-active");
    }

    function revealPageContent() {
      document
        .querySelectorAll("body > *:not(#roru-page-transition)")
        .forEach((el) => {
          (el as HTMLElement).style.removeProperty("visibility");
        });
    }

    let startedContentReveal = false;
    function startContentReveal() {
      if (startedContentReveal) return;
      startedContentReveal = true;
      revealPageContent();
      if (pathname === "/") {
        runPostLoaderSequence(false, true);
      }
    }

    {
      const cols0 = getColumns();
      killColumnTweens(cols0);
      setColumnsVisual(cols0, "covered");
    }
    overlay.classList.add("is-active");
    const outCols = getColumns();
    const delayReveal = gsap.delayedCall(REVEAL_OVERLAP_S, startContentReveal);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const master = gsap.timeline({
          onComplete: () => {
            delayReveal.kill();
            if (!startedContentReveal) startContentReveal();
            document.documentElement.classList.remove("roru-transition-pending");
            hideOverlay();
            const cols = getColumns();
            killColumnTweens(cols);
            setColumnsVisual(cols, "off");
            try {
              sessionStorage.removeItem(TRANSITION_PENDING_KEY);
            } catch {
              /* ignore */
            }
          },
        });
        outCols.forEach((col) => {
          master.add(buildColExitTl(col), 0);
        });
      });
    });

    return () => {
      delayReveal.kill();
    };
  }, [pathname]);

  return (
    <div
      className="roru-page-transition"
      id="roru-page-transition"
      aria-hidden="true"
      ref={overlayRef}
    />
  );
}
