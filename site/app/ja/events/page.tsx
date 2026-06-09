import type { Metadata } from "next";
import { EventsView } from "@/components/views/EventsView";
import { buildPageMetadata } from "@/lib/page-seo";

export const metadata: Metadata = buildPageMetadata("events", "jp");

export default function EventsJa() {
  return <EventsView lang="jp" />;
}
