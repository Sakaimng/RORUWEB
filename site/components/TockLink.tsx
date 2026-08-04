"use client";

import {
  useEffect,
  useState,
  type ComponentPropsWithoutRef,
} from "react";
import {
  buildTockTrackingUrl,
  type TockAttribution,
} from "@/lib/analytics";

type TockLinkProps = Omit<ComponentPropsWithoutRef<"a">, "href"> &
  TockAttribution & {
    href: string;
  };

/**
 * Keeps server output deterministic, then adds current campaign parameters
 * after hydration before a guest follows an Explore Tock link.
 */
export function TockLink({
  href,
  campaign,
  content,
  ...anchorProps
}: TockLinkProps) {
  const [trackedHref, setTrackedHref] = useState(href);

  useEffect(() => {
    setTrackedHref(buildTockTrackingUrl(href, { campaign, content }));
  }, [campaign, content, href]);

  return <a {...anchorProps} href={trackedHref} />;
}
