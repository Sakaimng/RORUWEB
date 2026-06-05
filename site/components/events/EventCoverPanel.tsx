"use client";

import Image from "next/image";
import { PREOPTIMIZED_IMAGE } from "@/lib/image-display";

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
            loading="lazy"
            {...PREOPTIMIZED_IMAGE}
          />
          <Image
            src={images.mobile}
            alt=""
            fill
            className="roru-gallery-feature__image roru-gallery-feature__image--mobile"
            sizes="(max-width: 767px) 100vw, 0px"
            loading="lazy"
            {...PREOPTIMIZED_IMAGE}
          />
        </div>
      </div>
    </section>
  );
}
