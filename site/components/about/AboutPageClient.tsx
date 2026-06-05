"use client";

import { AboutScrollScenes } from "@/components/about/AboutScrollScenes";
import { PageOverlayShell } from "@/components/PageOverlayShell";
import type { AboutScrollScenesProps } from "@/components/about/AboutScrollScenes";

export function AboutPageClient(props: AboutScrollScenesProps) {
  return (
    // Non-scrollable panel: AboutScrollScenes steps its three text scenes discretely
    // (one gesture = one change) and hands off to the footer panel, like home/events.
    <PageOverlayShell contentClassName="roru-home-overlay-panel--about">
      <AboutScrollScenes {...props} />
    </PageOverlayShell>
  );
}
