"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { EVENTS, type SiteEvent } from "@/lib/content";
import { hkDateKey } from "@/lib/hk-date";

function isEventPast(e: SiteEvent, today: string): boolean {
  const parts = e.eventDate.split(/[,\s]+/).map((s) => s.trim());
  const first =
    parts.find((s) => /^\d{4}-\d{2}-\d{2}$/.test(s)) ?? parts[0] ?? e.eventDate;
  return first < today;
}

export function EventsSection() {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const today = hkDateKey();

  const lists = useMemo(() => {
    const past: SiteEvent[] = [];
    const upcoming: SiteEvent[] = [];
    EVENTS.forEach((ev) => {
      const p = isEventPast(ev, today);
      if (p) {
        past.push({ ...ev, status: "Past" });
      } else {
        upcoming.push({ ...ev, status: "Upcoming" });
      }
    });
    upcoming.sort((a, b) => a.eventDate.localeCompare(b.eventDate));
    past.sort((a, b) => b.eventDate.localeCompare(a.eventDate));
    return { past, upcoming };
  }, [today]);

  const items = tab === "past" ? lists.past : lists.upcoming;

  return (
    <section className="roru-events-section homepage-reveal section-surface border-t border-[color:rgba(245,69,0,0.2)]">
      <div className="roru-events-grid grid min-h-screen grid-cols-6 items-end gap-[9px] px-[2vw] py-[min(8vh,80px)] text-[var(--text)]">
        <div className="roru-events-heading col-span-6">
          <h2 className="m-0 text-left text-[clamp(48px,7vw,132px)] font-thin uppercase leading-[0.82] tracking-[0.03em] indent-[-0.3%]">
            Events
          </h2>
        </div>

        <div className="roru-events-tabs col-span-6 flex justify-start gap-[18px] self-start pt-3 md:justify-end">
          <button
            type="button"
            className={`roru-events-tab cursor-pointer border-0 bg-transparent p-0 text-lg leading-none tracking-[0.04em] transition-opacity ${
              tab === "upcoming" ? "is-active opacity-100" : "opacity-35"
            }`}
            onClick={() => setTab("upcoming")}
          >
            Upcoming
          </button>
          <button
            type="button"
            className={`roru-events-tab cursor-pointer border-0 bg-transparent p-0 text-lg leading-none tracking-[0.04em] transition-opacity ${
              tab === "past" ? "is-active opacity-100" : "opacity-35"
            }`}
            onClick={() => setTab("past")}
          >
            Past
          </button>
        </div>

        <div className="roru-events-list col-span-6 grid grid-cols-6 gap-[9px]">
          {items.length === 0 ? (
            <Empty tab={tab} />
          ) : (
            items.map((event) => <EventCard key={event.title} event={event} />)
          )}
        </div>
      </div>
    </section>
  );
}

function Empty({ tab }: { tab: "upcoming" | "past" }) {
  return (
    <article className="roru-event-card col-span-6 grid min-h-[280px] grid-cols-1 gap-[9px] border-t border-[color:rgba(245,69,0,0.36)] pt-[18px] md:min-h-[320px] md:grid-cols-6">
      <div className="roru-event-card__meta col-span-6 flex flex-col gap-2.5">
        <div className="text-sm text-[var(--text)] opacity-70">Archive</div>
        <div className="text-sm text-[var(--text)] opacity-70">
          {tab === "past" ? "Past" : "Upcoming"}
        </div>
      </div>
      <div className="roru-event-card__wrap col-span-6">
        <h3 className="roru-event-card__title mt-[6vh] text-[clamp(24px,2.2vw,42px)] font-light leading-[0.96] text-[var(--text)]">
          {tab === "past" ? "No Past Events Yet" : "More Events Soon"}
        </h3>
        <p className="roru-event-card__desc mt-2 text-[clamp(14px,1vw,18px)] leading-snug text-[var(--text)] opacity-80">
          {tab === "past"
            ? "Past events will appear here once the archive is ready."
            : "Upcoming events will appear here once the next programme is announced."}
        </p>
      </div>
    </article>
  );
}

function EventCard({ event }: { event: SiteEvent }) {
  return (
    <article className="roru-event-card col-span-6 grid min-h-[280px] grid-cols-1 gap-4 border-t border-[color:rgba(245,69,0,0.36)] pt-[18px] md:min-h-[320px] md:grid-cols-6 md:gap-[9px]">
      <div className="roru-event-card__meta col-span-6 flex flex-col gap-2.5">
        <div className="roru-event-card__date text-sm text-[var(--text)] opacity-70">
          {event.date}
        </div>
        <div className="roru-event-card__status text-sm text-[var(--text)] opacity-70">
          {event.status}
        </div>
      </div>

      <div className="roru-event-card__body col-span-6 grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
        <div className="roru-event-card__wrap">
          <h3 className="roru-event-card__title mt-[6vh] text-[clamp(24px,2.2vw,42px)] font-light leading-[0.96] text-[var(--text)]">
            {event.title}
          </h3>
          <p className="roru-event-card__desc mt-2 text-[clamp(14px,1vw,18px)] leading-snug text-[var(--text)] opacity-80">
            {event.description}
          </p>
          {event.link !== "#" && (
            <a
              href={event.link}
              className="roru-event-card__link mt-8 inline-block text-sm uppercase leading-none tracking-[0.06em] text-[var(--accent)]"
              target="_blank"
              rel="noreferrer"
            >
              Details
            </a>
          )}
        </div>
        <a
          href={event.link}
          className="roru-event-card__image-link col-span-6 block md:col-span-1"
          target="_blank"
          rel="noreferrer"
        >
          <div className="roru-event-card__image-wrap mt-[18px] w-full md:w-1/2">
            <Image
              src={event.image}
              alt=""
              width={800}
              height={400}
              className="roru-event-card__image aspect-[2/1] h-auto w-full object-cover"
              sizes="(max-width: 767px) 100vw, 40vw"
            />
          </div>
        </a>
      </div>
    </article>
  );
}
