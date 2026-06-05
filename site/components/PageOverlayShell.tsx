"use client";

import type { ReactNode } from "react";
import { HomeYslScroll } from "@/components/HomeYslScroll";
import { SiteFooter } from "@/components/SiteFooter";

type Props = {
  children: ReactNode;
  /** Allow scrolling within the content panel before stepping to the footer. */
  scrollable?: boolean;
  /** Extra class on the content overlay panel. */
  contentClassName?: string;
  className?: string;
};

export function PageOverlayShell({
  children,
  scrollable = false,
  contentClassName = "",
  className = "",
}: Props) {
  return (
    <>
      <HomeYslScroll />
      <main
        id="page-content"
        className={`page-content roru-home-overlays relative z-[9] mb-[100vh] ${className}`.trim()}
      >
        <div className="roru-home-overlay-stack">
          <div
            className={[
              "roru-home-overlay-panel homepage-reveal",
              scrollable ? "roru-home-overlay-panel--scrollable" : "",
              contentClassName,
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {children}
          </div>
          <div className="roru-home-overlay-panel roru-home-overlay-panel--footer">
            <SiteFooter />
          </div>
        </div>
      </main>
    </>
  );
}
