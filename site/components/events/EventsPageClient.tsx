"use client";

import { useMemo, useState } from "react";
import { EventCoverPanel } from "@/components/events/EventCoverPanel";
import { EventDetailOverlay } from "@/components/events/EventDetailOverlay";
import { EventsPanelCta } from "@/components/events/EventsPanelCta";
import { HomeYslScroll } from "@/components/HomeYslScroll";
import { ImageLightbox } from "@/components/ImageLightbox";
import { SiteFooter } from "@/components/SiteFooter";
import {
  EVENT_GALLERIES,
  PAST_EVENT_PANELS,
  RORU_AFTER_DARK_EVENT,
} from "@/lib/event-galleries";

export function EventsPageClient() {
  const [galleryEventId, setGalleryEventId] = useState<string | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);

  const galleryImages = useMemo(() => {
    if (!galleryEventId) return [];
    return EVENT_GALLERIES[galleryEventId as keyof typeof EVENT_GALLERIES]?.images ?? [];
  }, [galleryEventId]);

  function openGallery(eventId: string) {
    setGalleryEventId(eventId);
    setGalleryIndex(0);
  }

  function closeGallery() {
    setGalleryEventId(null);
    setGalleryIndex(0);
  }

  function openEventDetail(eventId: string) {
    if (eventId === RORU_AFTER_DARK_EVENT.id) {
      setDetailOpen(true);
    }
  }

  return (
    <>
      <HomeYslScroll />
      <EventsPanelCta
        onOpenGallery={openGallery}
        onOpenDetail={openEventDetail}
      />
      {galleryEventId && galleryImages.length > 0 ? (
        <ImageLightbox
          images={galleryImages}
          active={galleryIndex}
          onClose={closeGallery}
          onChange={setGalleryIndex}
        />
      ) : null}
      {detailOpen ? (
        <EventDetailOverlay
          event={RORU_AFTER_DARK_EVENT}
          onClose={() => setDetailOpen(false)}
        />
      ) : null}
      <main
        id="page-content"
        className="page-content roru-home-overlays relative z-[9] mb-[100vh]"
      >
        <div className="roru-home-overlay-stack">
          <button
            type="button"
            className="roru-home-overlay-panel roru-event-panel-open homepage-reveal"
            data-home-cta
            data-home-cta-id={RORU_AFTER_DARK_EVENT.id}
            data-home-cta-title={RORU_AFTER_DARK_EVENT.title}
            data-home-cta-action="detail"
            onClick={() => openEventDetail(RORU_AFTER_DARK_EVENT.id)}
            aria-label={`Open details for ${RORU_AFTER_DARK_EVENT.title}`}
          >
            <EventCoverPanel
              images={{
                desktop: RORU_AFTER_DARK_EVENT.desktopThumbnail,
                mobile: RORU_AFTER_DARK_EVENT.mobileThumbnail,
              }}
              label={RORU_AFTER_DARK_EVENT.title}
              centerLabel={RORU_AFTER_DARK_EVENT.centerLabel}
            />
          </button>
          {PAST_EVENT_PANELS.map((event) => {
            const gallery = EVENT_GALLERIES[event.id as keyof typeof EVENT_GALLERIES];
            if (!gallery) return null;

            return (
              <button
                key={event.id}
                type="button"
                className="roru-home-overlay-panel roru-event-panel-open homepage-reveal"
                data-home-cta
                data-home-cta-id={event.id}
                data-home-cta-title={event.title}
                data-home-cta-action="gallery"
                onClick={() => openGallery(event.id)}
                aria-label={`Open gallery for ${event.title}`}
              >
                <EventCoverPanel
                  images={{
                    desktop: gallery.coverDesktop,
                    mobile: gallery.coverMobile,
                  }}
                  label={event.title}
                />
              </button>
            );
          })}
          <div className="roru-home-overlay-panel roru-home-overlay-panel--footer">
            <SiteFooter />
          </div>
        </div>
      </main>
    </>
  );
}
