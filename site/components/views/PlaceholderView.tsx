import { AboutBodyClass } from "@/components/about/AboutBodyClass";
import { AboutPageClient } from "@/components/about/AboutPageClient";
import { ABOUT_SEQUENCE, ABOUT_STORY_IMAGES } from "@/lib/content";

/** Hidden draft page — same layout as About, not linked in nav or sitemap. */
export function PlaceholderView() {
  return (
    <>
      <AboutBodyClass />
      <AboutPageClient sequence={ABOUT_SEQUENCE} storyImages={ABOUT_STORY_IMAGES} />
    </>
  );
}
