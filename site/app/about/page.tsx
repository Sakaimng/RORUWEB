import { AboutBodyClass } from "@/components/about/AboutBodyClass";
import { AboutScrollScenes } from "@/components/about/AboutScrollScenes";
import { SiteFooter } from "@/components/SiteFooter";
import { ABOUT_SEQUENCE, ABOUT_STORY_IMAGES } from "@/lib/content";

export default function AboutPage() {
  return (
    <>
      <AboutBodyClass />
      <main id="page-content" className="page-content relative z-[9] mb-[100vh]">
        <AboutScrollScenes sequence={ABOUT_SEQUENCE} storyImages={ABOUT_STORY_IMAGES} />
      </main>
      <SiteFooter />
    </>
  );
}
