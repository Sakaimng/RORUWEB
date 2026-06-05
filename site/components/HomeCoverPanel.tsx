"use client";

import Image from "next/image";
import Link from "next/link";
import { PREOPTIMIZED_IMAGE } from "@/lib/image-display";

type CoverImages = {
  desktop: string;
  mobile: string;
};

type Props = {
  images: CoverImages;
  href: string;
  ariaLabel: string;
};

/** Full-viewport cover image panel for the home overlay stack (responsive desktop/mobile BG). */
export function HomeCoverPanel({ images, href, ariaLabel }: Props) {
  const isExternal = /^https?:\/\//.test(href);

  return (
    <section className="roru-gallery-section roru-gallery-section--featured section-surface">
      <div className="roru-gallery-shell">
        <Link
          href={href}
          className="roru-gallery-feature"
          aria-label={ariaLabel}
          scroll={false}
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noreferrer" : undefined}
        >
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
        </Link>
      </div>
    </section>
  );
}
