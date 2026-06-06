import { HomeClientEntrance } from "@/components/HomeClientEntrance";
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

export default function Home() {
  return (
    <>
      <HomeClientEntrance />
      <HomeYslScroll />
      <HomeSectionCta />
      <main
        id="page-content"
        className="page-content roru-home-overlays relative z-[9] mb-[100vh]"
      >
        <div className="roru-home-overlay-stack">
          <div className="roru-home-overlay-panel roru-home-overlay-panel--hero">
            <HeroSection />
          </div>
          <div
            className="roru-home-overlay-panel homepage-reveal"
            data-home-cta
            data-home-cta-id="events"
            data-home-cta-title="Events"
            data-home-cta-href="/events"
          >
            <HomeCoverPanel
              images={HOME_EVENTS_COVER_IMAGES}
              href="/events"
              ariaLabel="Discover events"
            />
          </div>
          <div
            className="roru-home-overlay-panel homepage-reveal"
            data-home-cta
            data-home-cta-id="reserve"
            data-home-cta-title="reserve"
            data-home-cta-href="/reserve"
          >
            <HomeCoverPanel
              images={HOME_RESERVE_COVER_IMAGES}
              href="/reserve"
              ariaLabel="Discover reservations"
            />
          </div>
          <div
            className="roru-home-overlay-panel homepage-reveal"
            data-home-cta
            data-home-cta-id="about"
            data-home-cta-title="About"
            data-home-cta-href="/about"
          >
            <HomeCoverPanel
              images={HOME_ABOUT_COVER_IMAGES}
              href="/about"
              ariaLabel="About RORUBARU"
            />
          </div>
          {/* No Discover CTA/title on inquiry — the CTA fades out when this panel is active. */}
          <div className="roru-home-overlay-panel homepage-reveal">
            <InquirySection />
          </div>
          <div className="roru-home-overlay-panel roru-home-overlay-panel--footer">
            <SiteFooter />
          </div>
        </div>
      </main>
    </>
  );
}
