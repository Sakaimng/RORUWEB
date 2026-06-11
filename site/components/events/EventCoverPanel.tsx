"use client";

import { ResponsiveCoverPicture } from "@/components/ResponsiveCoverPicture";

type CoverImages = {
  desktop: string;
  mobile: string;
};

type Props = {
  images: CoverImages;
  label: string;
};

/** Full-viewport event cover (no link) for the events overlay stack. */
export function EventCoverPanel({ images, label }: Props) {
  return (
    <section
      className="roru-gallery-section roru-gallery-section--featured section-surface"
      aria-label={label}
    >
      <div className="roru-gallery-shell">
        <div className="roru-gallery-feature">
          <ResponsiveCoverPicture
            desktop={images.desktop}
            mobile={images.mobile}
          />
        </div>
      </div>
    </section>
  );
}
