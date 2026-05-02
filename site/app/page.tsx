import dynamic from "next/dynamic";
import { HomeClientEntrance } from "@/components/HomeClientEntrance";
import { HeroSection } from "@/components/HeroSection";
import { SiteFooter } from "@/components/SiteFooter";
import { GALLERY_IMAGES } from "@/lib/content";

const GallerySection = dynamic(
  () =>
    import("@/components/GallerySection").then((m) => ({ default: m.GallerySection })),
  {
    loading: () => (
      <div
        className="min-h-[100svh] w-full bg-[var(--surface)]"
        aria-hidden
      />
    ),
  }
);

const BookingSection = dynamic(
  () =>
    import("@/components/BookingSection").then((m) => ({ default: m.BookingSection })),
  {
    loading: () => (
      <div
        className="min-h-screen w-full bg-[var(--surface)]"
        aria-hidden
      />
    ),
  }
);

const EventsSection = dynamic(
  () =>
    import("@/components/EventsSection").then((m) => ({ default: m.EventsSection })),
  {
    loading: () => (
      <div
        className="min-h-screen w-full bg-[var(--surface)]"
        aria-hidden
      />
    ),
  }
);

const InquirySection = dynamic(
  () =>
    import("@/components/InquirySection").then((m) => ({ default: m.InquirySection })),
  {
    loading: () => (
      <div
        className="min-h-[50vh] w-full bg-[var(--surface)]"
        aria-hidden
      />
    ),
  }
);

export default function Home() {
  return (
    <>
      <HomeClientEntrance />
      <main id="page-content" className="page-content relative z-[9] mb-[100vh]">
        <HeroSection />
        <GallerySection images={GALLERY_IMAGES} />
        <BookingSection />
        <EventsSection />
        <InquirySection />
      </main>
      <SiteFooter />
    </>
  );
}
