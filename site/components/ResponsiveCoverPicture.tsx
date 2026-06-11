"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { PREOPTIMIZED_IMAGE } from "@/lib/image-display";

const MOBILE_MEDIA = "(max-width: 767px)";

type Props = {
  desktop: string;
  mobile: string;
  className?: string;
  loading?: "lazy" | "eager";
  priority?: boolean;
};

/**
 * One cover per viewport — desktop and mobile assets are distinct;
 * only the matching image is mounted (no double download).
 */
export function ResponsiveCoverPicture({
  desktop,
  mobile,
  className = "",
  loading = "lazy",
  priority = false,
}: Props) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MEDIA);
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const src = isMobile ? mobile : desktop;

  return (
    <Image
      key={src}
      src={src}
      alt=""
      fill
      priority={priority}
      loading={loading}
      decoding="async"
      sizes="100vw"
      className={`roru-gallery-feature__image ${className}`.trim()}
      {...PREOPTIMIZED_IMAGE}
    />
  );
}
