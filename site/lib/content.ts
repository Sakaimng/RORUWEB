export type { HeroSlide } from "./home-hero-slides";
export { HOME_HERO_SLIDES } from "./home-hero-slides";

/** @deprecated Hero uses HOME_HERO_SLIDES; kept for home-covers asset pipeline. */
export const HOME_HERO_IMAGES = {
  desktop: "/home-covers/Desktop Home Hero BG.webp",
  mobile: "/home-covers/Mobile Home Hero BG.webp",
} as const;

/** Home overlay — About panel (after Reserve) links to `/about`. */
export const HOME_ABOUT_COVER_IMAGES = {
  desktop: "/home-covers/About Desktop Home BG.webp",
  mobile: "/home-covers/About Mobile Home BG.webp",
} as const;

export const HOME_EVENTS_COVER_IMAGES = {
  desktop: "/home-covers/Event Home Desktop BG.webp",
  mobile: "/home-covers/Event Home Mobile BG.webp",
} as const;

export const HOME_RESERVE_COVER_IMAGES = {
  desktop: "/home-covers/Reserve Home Desktop.webp",
  mobile: "/home-covers/Reserve Home Mobile.webp",
} as const;

/** @deprecated Use HOME_EVENTS_COVER_IMAGES — kept for any external references. */
export const EVENTS_COVER_IMAGE = HOME_EVENTS_COVER_IMAGES.desktop;
/** @deprecated Use HOME_RESERVE_COVER_IMAGES — kept for any external references. */
export const RESERVE_COVER_IMAGE = HOME_RESERVE_COVER_IMAGES.desktop;

/** Served from `site/public/homePageImages`. */
export const LOGO_URL =
  "https://images.squarespace-cdn.com/content/69b2766f53fe2311e30733fe/83068be0-15b6-42ca-8df7-126b99ef5aaa/rorubaruNewLogo.png?content-type=image%2Fpng";

export const TOCK_URL = "https://www.exploretock.com/roru-baru";

/** Inquiries: shown in the footer and as fallback when email delivery is not configured. */
export const INQUIRY_PUBLIC_EMAIL = "hello@rorubaru.com";

export const SITE_MAP_URL =
  "https://maps.google.com/?q=100-102+Queen's+Road+East,+Wan+Chai,+Hong+Kong";

/** Single line for the fixed nav address strip. */
export const SITE_ADDRESS_DOCK_LINE =
  "G/F, 100–102 Queen's Road East, Wan Chai, Hong Kong Island";

export type SiteEvent = {
  title: string;
  date: string;
  eventDate: string;
  status: string;
  description: string;
  image: string;
  link: string;
};

export const EVENTS: SiteEvent[] = [
  {
    title: "Grand Opening",
    date: "March 2026",
    eventDate: "2026-03-06",
    status: "Past",
    description:
      "Six Pack Chef Wallace Wong joins Chef Joey Chan behind our counter, with DJ Mike Wolf from 8PM.",
    image: "/event-poster/260306_Roru-Baru_Grand-Opening_2000x1000.webp",
    link: "https://www.exploretock.com/roru-baru/event/599802/grand-opening-with-six-pack-chef-chef-wallace-wong",
  },
  {
    title: "Delia x Rorubaru",
    date: "April 2026",
    eventDate: "2026-04-24, 2026-04-25",
    status: "Upcoming",
    description:
      "Roru Baru presents a special collaboration between Chef Joey Chan and Chef Diego Zarco of Delia Bangkok, founded by Gabriela Espinosa.",
    image: "/event-poster/delia-roru-sqspace.webp",
    link: "https://www.exploretock.com/roru-baru/event/603359/roru-baru-x-delia",
  },
];

/** About page grid — files in `site/public/aboutPageImages` (alphabetical). */
export const ABOUT_PAGE_IMAGES: { src: string; n: string }[] = [
  { src: "/aboutPageImages/DSC07800.webp", n: "01" },
  { src: "/aboutPageImages/DSC07910.webp", n: "02" },
  { src: "/aboutPageImages/L1052879.webp", n: "03" },
  { src: "/aboutPageImages/L1052894.webp", n: "04" },
  { src: "/aboutPageImages/L1052984.webp", n: "05" },
  { src: "/aboutPageImages/L1053041.webp", n: "06" },
  { src: "/aboutPageImages/L1053100.webp", n: "07" },
  { src: "/aboutPageImages/L1053309.webp", n: "08" },
  { src: "/aboutPageImages/L1053310.webp", n: "09" },
  { src: "/aboutPageImages/L1053338.webp", n: "10" },
  { src: "/aboutPageImages/L1053412.webp", n: "11" },
  { src: "/aboutPageImages/L1053624.webp", n: "12" },
];

/** Hero marquee order (matches Squarespace about sequence). */
export const ABOUT_SEQUENCE: { src: string; n: string; alt: string }[] = [
  { src: "/aboutPageImages/L1053310.webp", n: "01", alt: "A RORUBARU team member in a Roru Baru tee at the hand roll counter in Wan Chai, Hong Kong" },
  { src: "/aboutPageImages/L1053309.webp", n: "02", alt: "Portrait of a RORUBARU team member" },
  { src: "/aboutPageImages/L1053338.webp", n: "03", alt: "A RORUBARU team member celebrating the opening of the Wan Chai hand roll bar" },
  { src: "/aboutPageImages/L1053100.webp", n: "04", alt: "RORUBARU staff preparing hand rolls at the counter — shirt reads 'rolled to order, served at its freshest'" },
  { src: "/aboutPageImages/L1052894.webp", n: "05", alt: "Lion dance heads at the RORUBARU opening celebration in Wan Chai, Hong Kong" },
  { src: "/aboutPageImages/L1053041.webp", n: "06", alt: "The RORUBARU team with lion dancers at the hand roll bar's grand opening in Wan Chai" },
  { src: "/aboutPageImages/L1052984.webp", n: "07", alt: "Guests at the opening night of RORUBARU, Hong Kong's original hand roll bar" },
  { src: "/aboutPageImages/L1052879.webp", n: "08", alt: "RORUBARU (Roru Baru) signage at the Wan Chai hand roll bar entrance" },
  { src: "/aboutPageImages/L1053624.webp", n: "09", alt: "A RORUBARU chef hand-rolling temaki with rice and Japanese nori at the counter" },
  { src: "/aboutPageImages/DSC07800.webp", n: "10", alt: "Close-up of a temaki hand roll being made with rice and crisp Japanese nori at RORUBARU" },
];

/** Story masonry (section 3). */
export const ABOUT_STORY_IMAGES = {
  large: "/aboutPageImages/DSC07910.webp",
  top: "/aboutPageImages/L1053412.webp",
  bottom: "/aboutPageImages/L1053624.webp",
} as const;

export function getHongKongHour(): number {
  const s = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Hong_Kong",
    hour: "numeric",
    hour12: false,
  });
  return parseInt(s, 10);
}
