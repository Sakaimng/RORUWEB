/** Gallery scroll — same order as the original site (files in `/homePageImages`). */
export const GALLERY_IMAGES = [
  "/homePageImages/L1053430.jpg",
  "/homePageImages/L1053433.jpg",
  "/homePageImages/L1053405.jpg",
  "/homePageImages/DSC07910.jpg",
  "/homePageImages/L1053336.jpg",
  "/homePageImages/L1052807.jpg",
  "/homePageImages/L1052778.jpg",
  "/homePageImages/L1053170.jpg",
  "/homePageImages/DSC07924.jpg",
  "/homePageImages/DSC07827.jpg",
  "/homePageImages/DSC07643.jpg",
  "/homePageImages/DSC07596.jpg",
  "/homePageImages/DSC07800.jpg",
] as const;

/** Served from `/public` via symlink to repo `homePageImages` (see project root). */
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

export const BOOKING_NOTES: Record<"lunch" | "dinner", string> = {
  lunch:
    "Only electronic payments are accepted at the venue. Dining experience for Lunch is 60 minutes from reservation time. Table reservations will be held for a maximum of 10 minutes after the reservation time.",
  dinner:
    "Only electronic payments are accepted at the venue. Dining experience for Dinner is 75 minutes from reservation time. Table reservations will be held for a maximum of 10 minutes after the reservation time.",
};

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

/** About page grid — files in `/aboutPageImages` (alphabetical). */
export const ABOUT_PAGE_IMAGES: { src: string; n: string }[] = [
  { src: "/aboutPageImages/DSC07800.jpg", n: "01" },
  { src: "/aboutPageImages/DSC07910.jpg", n: "02" },
  { src: "/aboutPageImages/L1052879.jpg", n: "03" },
  { src: "/aboutPageImages/L1052894.jpg", n: "04" },
  { src: "/aboutPageImages/L1052984.jpg", n: "05" },
  { src: "/aboutPageImages/L1053041.jpg", n: "06" },
  { src: "/aboutPageImages/L1053100.jpg", n: "07" },
  { src: "/aboutPageImages/L1053309.jpg", n: "08" },
  { src: "/aboutPageImages/L1053310.jpg", n: "09" },
  { src: "/aboutPageImages/L1053338.jpg", n: "10" },
  { src: "/aboutPageImages/L1053412.jpg", n: "11" },
  { src: "/aboutPageImages/L1053624.jpg", n: "12" },
];

/** Hero marquee order (matches Squarespace about sequence). */
export const ABOUT_SEQUENCE: { src: string; n: string; alt: string }[] = [
  { src: "/aboutPageImages/L1053310.jpg", n: "01", alt: "About image 01" },
  { src: "/aboutPageImages/L1053309.jpg", n: "02", alt: "About image 02" },
  { src: "/aboutPageImages/L1053338.jpg", n: "03", alt: "About image 03" },
  { src: "/aboutPageImages/L1053100.jpg", n: "04", alt: "About image 04" },
  { src: "/aboutPageImages/L1052894.jpg", n: "05", alt: "About image 05" },
  { src: "/aboutPageImages/L1053041.jpg", n: "06", alt: "About image 06" },
  { src: "/aboutPageImages/L1052984.jpg", n: "07", alt: "About image 07" },
  { src: "/aboutPageImages/L1052879.jpg", n: "08", alt: "About image 08" },
  { src: "/aboutPageImages/L1053624.jpg", n: "09", alt: "About image 09" },
  { src: "/aboutPageImages/DSC07800.jpg", n: "10", alt: "About image 10" },
];

/** Story masonry (section 3). */
export const ABOUT_STORY_IMAGES = {
  large: "/aboutPageImages/DSC07910.jpg",
  top: "/aboutPageImages/L1053412.jpg",
  bottom: "/aboutPageImages/L1053624.jpg",
} as const;

export function getHongKongHour(): number {
  const s = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Hong_Kong",
    hour: "numeric",
    hour12: false,
  });
  return parseInt(s, 10);
}
