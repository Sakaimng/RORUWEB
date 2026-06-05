"use client";

import Image from "next/image";

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
          <Image
            src={images.desktop}
            alt=""
            fill
            className="roru-gallery-feature__image roru-gallery-feature__image--desktop"
            sizes="(max-width: 767px) 0px, 100vw"
          />
          <Image
            src={images.mobile}
            alt=""
            fill
            className="roru-gallery-feature__image roru-gallery-feature__image--mobile"
            sizes="(max-width: 767px) 100vw, 0px"
          />
        </div>
      </div>
    </section>
  );
}
