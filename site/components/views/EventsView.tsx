import { EventsPageClient } from "@/components/events/EventsPageClient";
import { JsonLd } from "@/components/JsonLd";
import { EVENTS } from "@/lib/content";
import type { Lang } from "@/lib/i18n";
import { breadcrumbList, eventsGraph } from "@/lib/structured-data";

export function EventsView({ lang }: { lang: Lang }) {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbList(
            [
              { name: "Home", path: "/" },
              { name: "Events", path: "/events" },
            ],
            lang,
          ),
          eventsGraph([...EVENTS]),
        ]}
      />
      {/*
        The visual events are rendered as image galleries (not crawlable text).
        This accessible, server-rendered summary exposes the same real event
        details — names, dates, chefs, booking links — to screen readers and
        search engines.
      */}
      <section className="sr-only" aria-label="RORUBARU events">
        <h1>Events at RORUBARU — Hong Kong&apos;s original hand roll bar in Wan Chai</h1>
        <ul>
          {EVENTS.map((event) => (
            <li key={event.title}>
              <h2>
                {event.title} — {event.date} ({event.status})
              </h2>
              <p>{event.description}</p>
              <a href={event.link}>Book {event.title} on Tock</a>
            </li>
          ))}
        </ul>
      </section>
      <EventsPageClient />
    </>
  );
}
