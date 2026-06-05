import type { Metadata } from "next";
import { EventsPageClient } from "@/components/events/EventsPageClient";

export const metadata: Metadata = {
  title: "RORUBARU | Events",
  description:
    "RORUBARU events — collaborations, guest chefs, and happenings at Hong Kong's original hand roll bar.",
};

export default function EventsPage() {
  return <EventsPageClient />;
}
