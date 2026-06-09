import type { Metadata } from "next";
import { EventsView } from "@/components/views/EventsView";
import { buildPageMetadata } from "@/lib/page-seo";

export const metadata: Metadata = buildPageMetadata("events", "cn");

export default function EventsZhHant() {
  return <EventsView lang="cn" />;
}
