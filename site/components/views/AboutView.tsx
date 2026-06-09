import { AboutBodyClass } from "@/components/about/AboutBodyClass";
import { AboutPageClient } from "@/components/about/AboutPageClient";
import { JsonLd } from "@/components/JsonLd";
import { ABOUT_SEQUENCE, ABOUT_STORY_IMAGES } from "@/lib/content";
import type { Lang } from "@/lib/i18n";
import { breadcrumbList } from "@/lib/structured-data";

export function AboutView({ lang }: { lang: Lang }) {
  return (
    <>
      <JsonLd
        data={breadcrumbList(
          [
            { name: "Home", path: "/" },
            { name: "About", path: "/about" },
          ],
          lang,
        )}
      />
      <AboutBodyClass />
      <AboutPageClient sequence={ABOUT_SEQUENCE} storyImages={ABOUT_STORY_IMAGES} />
    </>
  );
}
