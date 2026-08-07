import manifest from "./event-galleries.manifest.json";

/**
 * Deployable event galleries under `public/event-galleries/`.
 * Regenerate assets: `npm run assets:event-galleries` (requires local source folders).
 */

export type EventGalleryManifest = {
  id: string;
  coverDesktop: string;
  coverMobile: string;
  images: readonly string[];
};

export const EVENT_GALLERIES = manifest.galleries as Record<
  string,
  EventGalleryManifest
>;

export const RORU_AFTER_DARK_EVENT = {
  id: "roru-after-dark",
  title: "RORU AFTER DARK",
  desktopThumbnail: "/event-galleries/delia-x-rorubaru/L1060247.webp",
  mobileThumbnail: "/event-galleries/delia-x-rorubaru/L1060246.webp",
  poster: "/RORU after dark Feed.jpg",
  centerLabel: "COMING SOON",
  schedule: "Every Friday from 8PM - Late",
  caption: [
    "The last hand roll is never the end of the night at Roru.",
    "Join us every Friday as the lights dim, the music turns up and the counter comes alive. Expect cocktails, sake and a soundtrack curated by DJ Mike Wolf of Sol Passion Music.",
    "Come for dinner. Stay for another round. Kanpai!",
    "Launching 21 August.",
  ],
} as const;

export const PAST_EVENT_PANELS = [
  {
    id: "invite-only-opening",
    title: "Invite Only Opening",
    date: "March 2026",
    eventDate: "2026-03-14",
  },
  {
    id: "grand-opening",
    title: "Grand Opening",
    date: "March 2026",
    eventDate: "2026-03-21",
    description:
      "Six Pack Chef Wallace Wong joins Chef Joey Chan behind our counter, with DJ Mike Wolf from 8PM.",
    link: "https://www.exploretock.com/roru-baru/event/599802/grand-opening-with-six-pack-chef-chef-wallace-wong",
  },
  {
    id: "delia-x-rorubaru",
    title: "Delia x Rorubaru",
    date: "April 2026",
    eventDate: "2026-04-25",
    description:
      "Roru Baru presents a special collaboration between Chef Joey Chan and Chef Diego Zarco of Delia Bangkok, founded by Gabriela Espinosa.",
    link: "https://www.exploretock.com/roru-baru/event/603359/roru-baru-x-delia",
  },
] as const;
