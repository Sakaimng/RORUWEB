// Past events: titles, dates and photos exactly as on rorubaru.com (repo Sakaimng/RORUWEB, site/lib/event-galleries.ts).
export default [{"title": "Delia x Rorubaru", "date": "April 2026", "images": ["events/delia-x-rorubaru/01.jpg", "events/delia-x-rorubaru/02.jpg", "events/delia-x-rorubaru/03.jpg", "events/delia-x-rorubaru/04.jpg", "events/delia-x-rorubaru/05.jpg", "events/delia-x-rorubaru/06.jpg", "events/delia-x-rorubaru/07.jpg", "events/delia-x-rorubaru/08.jpg"]}, {"title": "Grand Opening", "date": "March 2026", "images": ["events/grand-opening/01.jpg", "events/grand-opening/02.jpg", "events/grand-opening/03.jpg", "events/grand-opening/04.jpg", "events/grand-opening/05.jpg", "events/grand-opening/06.jpg", "events/grand-opening/07.jpg", "events/grand-opening/08.jpg"]}, {"title": "Invite Only Opening", "date": "March 2026", "images": ["events/invite-only-opening/01.jpg", "events/invite-only-opening/02.jpg", "events/invite-only-opening/03.jpg", "events/invite-only-opening/04.jpg", "events/invite-only-opening/05.jpg", "events/invite-only-opening/06.jpg", "events/invite-only-opening/07.jpg", "events/invite-only-opening/08.jpg"]}];

// Upcoming events (separate from the past ones above). Celosa: facts from @rorubaru's own IG post (Oct 6 2026, reel DeJsAGtuklb).
// Vietnam pop-up: facts from Dominic (Oct 15 2026) and the official RORUBARU × VIVAIA poster. Seating times and the Luma booking link: Dominic, Oct 15. No price, no menu: none announced.
// "date" (and "end" for multi-night events) are calendar days in the event's own time zone: "tz" hours ahead of UTC
// (8 = Hong Kong, the default; 7 = Vietnam). The banner and the panel card disappear after 23:59 local on the last day.
// "book": omitted = the site's own Book link; a URL = that link; false = no booking button yet ("booking" note only).
// "seatings" (optional): one line each under "seatingsLabel". "barTime" (optional): shorter time/place for the banner.
// Every English line here has its zh / ja line in i18n-dict.js.
export const upcoming = [{
  id: "celosa-2026-10-15",
  title: "RORUBARU × Celosa Rosé Tequila",
  date: "2026-10-15",
  day: "Thu 15 Oct",
  time: "from 6pm",
  kind: "One-night takeover",
  text: "Tequila pairings, slushies and a party.",
  booking: "Book as usual, same as a regular dinner.",
  image: "events/celosa/01.jpg"
}, {
  id: "vietnam-popup-2026-10-22",
  title: "RORUBARU with Vivaia",
  date: "2026-10-22",
  end: "2026-10-24",
  tz: 7,
  day: "Thu 22 – Sat 24 Oct",
  short: "22–24 Oct",
  time: "Ho Chi Minh City",
  barTime: "Vietnam",
  kind: "Three-night pop-up",
  where: "Tastemaker Hub, 10 Đ. Mỹ Phú 1A, Phú Mỹ Hưng, Ho Chi Minh City",
  map: "https://www.google.com/maps/search/?api=1&query=Tastemaker+Hub%2C+10+%C4%90%C6%B0%E1%BB%9Dng+M%E1%BB%B9+Ph%C3%BA+1A%2C+Ph%C3%BA+M%E1%BB%B9+H%C6%B0ng%2C+T%C3%A2n+M%E1%BB%B9%2C+H%E1%BB%93+Ch%C3%AD+Minh",
  text: "Our counter heads to Vietnam for three nights, with Vivaia and Koi Fitness & Wellness.",
  seatingsLabel: "Seatings · Vietnam time",
  seatings: ["5:45pm – 7:45pm", "8:00pm – 10:00pm"],
  book: "https://luma.com/20261012RORU",
  booking: "Booking via Luma.",
  image: "events/vietnam-popup/rorubaru-vivaia.jpg",
  poster: "events/vietnam-popup/rorubaru-vivaia.jpg"
}];
