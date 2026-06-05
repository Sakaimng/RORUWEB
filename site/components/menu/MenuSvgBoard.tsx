"use client";

import { useEffect, useRef } from "react";
import {
  applyMenuSvgTheme,
  isMenuMobileLayout,
  MENU_MOBILE_MAX_WIDTH,
} from "@/lib/menu-svg-process";

type Props = {
  src: string;
  /** Two single-column SVGs shown stacked at mobile widths. */
  mobileSrc: readonly [string, string];
  title: string;
  headingId: string;
};

async function mountMenuSvg(
  host: HTMLDivElement,
  url: string,
  ariaLabel: string,
  isCurrent: () => boolean
): Promise<void> {
  const response = await fetch(encodeURI(url));
  if (!response.ok || !isCurrent()) return;

  const doc = new DOMParser().parseFromString(await response.text(), "image/svg+xml");
  if (!isCurrent()) return;

  const svg = doc.documentElement;
  if (!(svg instanceof SVGSVGElement)) return;

  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", ariaLabel);
  applyMenuSvgTheme(svg);
  if (!isCurrent()) return;
  host.appendChild(svg);
}

export function MenuSvgBoard({ src, mobileSrc, title, headingId }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const renderIdRef = useRef(0);

  useEffect(() => {
    const hostEl = hostRef.current;
    if (!hostEl) return;

    let cancelled = false;

    async function render(useMobile: boolean) {
      if (cancelled || !hostRef.current) return;
      const container = hostRef.current;
      const renderId = renderIdRef.current + 1;
      renderIdRef.current = renderId;
      const isCurrent = () =>
        !cancelled && renderIdRef.current === renderId && hostRef.current === container;

      container.replaceChildren();

      if (useMobile) {
        container.classList.add("roru-menu-board__host--stack");

        for (let i = 0; i < mobileSrc.length; i++) {
          if (!isCurrent()) return;
          const partLabel = `${title} (${i + 1} of ${mobileSrc.length})`;
          await mountMenuSvg(container, mobileSrc[i], partLabel, isCurrent);
        }
      } else {
        container.classList.remove("roru-menu-board__host--stack");
        if (!isCurrent()) return;
        await mountMenuSvg(container, src, title, isCurrent);
      }
    }

    const layoutMq = window.matchMedia(`(max-width: ${MENU_MOBILE_MAX_WIDTH}px)`);

    function onLayoutChange() {
      void render(layoutMq.matches);
    }

    void render(isMenuMobileLayout());
    layoutMq.addEventListener("change", onLayoutChange);

    const themeObserver = new MutationObserver(() => {
      hostEl.querySelectorAll("svg").forEach((node) => {
        if (node instanceof SVGSVGElement) applyMenuSvgTheme(node);
      });
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      cancelled = true;
      renderIdRef.current += 1;
      layoutMq.removeEventListener("change", onLayoutChange);
      themeObserver.disconnect();
    };
  }, [src, mobileSrc, title]);

  return (
    <section className="roru-menu-board" aria-labelledby={headingId}>
      <h2 className="roru-menu-board__title" id={headingId}>
        {title}
      </h2>
      <div ref={hostRef} className="roru-menu-board__host" />
    </section>
  );
}
