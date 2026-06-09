import manifest from "./home-hero-slides.manifest.json";

export type HeroSlide = {
  src: string;
  focus: string;
};

/** Autoplay hero slideshow — WebP in `site/public/home-hero-slides`. */
export const HOME_HERO_SLIDES = manifest.slides as readonly HeroSlide[];
