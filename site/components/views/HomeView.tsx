import { HomeCoverPanel } from "@/components/HomeCoverPanel";
import { HomeSectionCta } from "@/components/HomeSectionCta";
import { HomeYslScroll } from "@/components/HomeYslScroll";
import { HeroSection } from "@/components/HeroSection";
import { InquirySection } from "@/components/InquirySection";
import { SiteFooter } from "@/components/SiteFooter";
import {
  HOME_EVENTS_COVER_IMAGES,
  HOME_ABOUT_COVER_IMAGES,
  HOME_RESERVE_COVER_IMAGES,
} from "@/lib/content";
import type { Lang } from "@/lib/i18n";
import { withLocale } from "@/lib/locale-routing";

/** Short crawlable intro (the home panels are mostly imagery). No "sushi": hand rolls / 手卷. */
const HOME_INTRO: Record<Lang, { title: string; body: string }> = {
  en: {
    title: "RORUBARU, Hong Kong's original hand roll bar in Wan Chai",
    body: "RORUBARU is a hand roll bar at G/F, 100-102 Queen's Road East, Wan Chai, Hong Kong. Tokyo-style hand rolls (temaki) are made to order at the counter with warm seasoned rice and crisp Japanese nori, with draught sake and highballs. Open daily 12:00 to 22:00. Book a counter seat on Tock or walk in.",
  },
  cn: {
    title: "RORUBARU 手卷吧：灣仔的香港首間手卷吧",
    body: "RORUBARU 手卷吧位於香港灣仔皇后大道東100-102號地下。師傅在吧枱即場製作東京風手卷，配溫熱醋飯和香脆日本紫菜，另有生啤、清酒及 Highball。每日 12:00 至 22:00 營業，可於 Tock 預約吧枱座位，亦歡迎即場光臨。",
  },
  jp: {
    title: "RORUBARU（ロルバル）香港・湾仔のハンドロールバー",
    body: "RORUBARU は香港・湾仔（Queen's Road East 100-102 G/F）のハンドロール（手巻き）バー。カウンターで温かいシャリとパリッとした日本の海苔を使い、東京スタイルの手巻きを一本ずつ仕立てます。生酒やハイボールも。毎日 12:00〜22:00 営業。Tock で予約、またはそのままお越しください。",
  },
};

/** Home page body, shared across all locale routes. Links stay in-locale. */
export function HomeView({ lang }: { lang: Lang }) {
  const eventsHref = withLocale("/events", lang);
  const reserveHref = withLocale("/reserve", lang);
  const aboutHref = withLocale("/about", lang);

  return (
    <>
      <HomeYslScroll />
      <HomeSectionCta />
      <main
        id="page-content"
        className="page-content roru-home-overlays relative z-[9] mb-[100vh]"
      >
        <section className="sr-only" aria-label={HOME_INTRO[lang].title}>
          <h2>{HOME_INTRO[lang].title}</h2>
          <p>{HOME_INTRO[lang].body}</p>
          <nav aria-label="RORUBARU">
            <a href={withLocale("/menu", lang)}>Menu</a>{" "}
            <a href={reserveHref}>Reserve</a>{" "}
            <a href={withLocale("/delivery", lang)}>Delivery</a>{" "}
            <a href={eventsHref}>Events</a>{" "}
            <a href={aboutHref}>About</a>
          </nav>
        </section>
        <div className="roru-home-overlay-stack">
          <div className="roru-home-overlay-panel roru-home-overlay-panel--hero is-active">
            <HeroSection />
          </div>
          <div
            className="roru-home-overlay-panel homepage-reveal is-after"
            data-home-cta
            data-home-cta-id="events"
            data-home-cta-title="Events"
            data-home-cta-href={eventsHref}
          >
            <HomeCoverPanel
              images={HOME_EVENTS_COVER_IMAGES}
              href={eventsHref}
              ariaLabel="Discover events"
            />
          </div>
          <div
            className="roru-home-overlay-panel homepage-reveal is-after"
            data-home-cta
            data-home-cta-id="reserve"
            data-home-cta-title="reservations"
            data-home-cta-href={reserveHref}
          >
            <HomeCoverPanel
              images={HOME_RESERVE_COVER_IMAGES}
              href={reserveHref}
              ariaLabel="Discover reservations"
            />
          </div>
          <div
            className="roru-home-overlay-panel homepage-reveal is-after"
            data-home-cta
            data-home-cta-id="about"
            data-home-cta-title="About"
            data-home-cta-href={aboutHref}
          >
            <HomeCoverPanel
              images={HOME_ABOUT_COVER_IMAGES}
              href={aboutHref}
              ariaLabel="About RORUBARU"
            />
          </div>
          {/* No Discover CTA/title on inquiry — the CTA fades out when this panel is active. */}
          <div className="roru-home-overlay-panel roru-home-overlay-panel--scrollable homepage-reveal is-after">
            <InquirySection />
          </div>
          <div className="roru-home-overlay-panel roru-home-overlay-panel--footer is-after">
            <SiteFooter />
          </div>
        </div>
      </main>
    </>
  );
}
