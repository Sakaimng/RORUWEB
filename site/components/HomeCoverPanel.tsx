"use client";

import Link from "next/link";
import { ResponsiveCoverPicture } from "@/components/ResponsiveCoverPicture";

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
          <ResponsiveCoverPicture
            desktop={images.desktop}
            mobile={images.mobile}
          />
        </Link>
      </div>
    </section>
  );
}
