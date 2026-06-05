import { AboutBodyClass } from "@/components/about/AboutBodyClass";
import { AboutPageClient } from "@/components/about/AboutPageClient";
import { ABOUT_SEQUENCE, ABOUT_STORY_IMAGES } from "@/lib/content";

export default function AboutPage() {
  return (
    <>
      <AboutBodyClass />
      <AboutPageClient sequence={ABOUT_SEQUENCE} storyImages={ABOUT_STORY_IMAGES} />
    </>
  );
}
