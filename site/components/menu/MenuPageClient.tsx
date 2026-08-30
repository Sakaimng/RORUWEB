"use client";

import Image from "next/image";
import { MenuSvgBoard } from "@/components/menu/MenuSvgBoard";

const ALA_CARTE_DESKTOP = "/menus/A La Carte menu Group.svg";
const DRINKS_DESKTOP = "/menus/Drinks Menu Group.svg";

const ALA_CARTE_MOBILE = [
  "/menus/A la carte 1.svg",
  "/menus/A la carte 2.svg",
] as const;

const DRINKS_MOBILE = [
  "/menus/DRINKS MENU 1.svg",
  "/menus/DRINKS MENU 2.svg",
] as const;

function StoryImage({
  src,
  className,
  sizes,
}: {
  src: string;
  className: string;
  sizes: string;
}) {
  return (
    <figure className={`roru-menu-story__image ${className}`}>
      <Image
        src={src}
        alt=""
        fill
        sizes={sizes}
        loading="lazy"
        className="roru-menu-story__image-media"
      />
    </figure>
  );
}

export function MenuPageClient() {
  return (
    <div className="roru-menu-page">
      <header className="roru-menu-page__header">
        <h1 className="roru-menu-page__title">Menus</h1>
      </header>

      <div className="roru-menu-page__boards">
        <MenuSvgBoard
          src={ALA_CARTE_DESKTOP}
          mobileSrc={ALA_CARTE_MOBILE}
          title="À la carte"
          headingId="roru-menu-ala-carte"
        />
        <MenuSvgBoard
          src={DRINKS_DESKTOP}
          mobileSrc={DRINKS_MOBILE}
          title="Drinks"
          headingId="roru-menu-drinks"
        />
      </div>

      <section className="roru-menu-story" aria-labelledby="roru-menu-story-title">
        <div
          className="roru-menu-story__gallery roru-menu-story__gallery--lunch"
          aria-hidden="true"
        >
          <StoryImage
            src="/MENU PAGE ITEMS/EDN08193 (1).jpg"
            className="roru-menu-story__image--large"
            sizes="(max-width: 767px) 72vw, 27vw"
          />
          <StoryImage
            src="/MENU PAGE ITEMS/EDN08182 (1).jpg"
            className="roru-menu-story__image--small-top"
            sizes="(max-width: 767px) 42vw, 16vw"
          />
          <StoryImage
            src="/MENU PAGE ITEMS/EDN08168-Edit (1).jpg"
            className="roru-menu-story__image--small-bottom"
            sizes="(max-width: 767px) 42vw, 16vw"
          />
        </div>
        <div className="roru-menu-story__content">
          <h2 id="roru-menu-story-title" className="roru-menu-story__title">
            Lunchtime at Roru
          </h2>
          <div className="roru-menu-story__copy">
            <p>
              Lunch at Roru is built around the Daily Bara Chirashi, our take on
              a Japanese lunchtime staple.
            </p>
            <p>
              Expect seasoned rice and a changing selection of fresh cuts chosen
              by Chef Joey and the team that day. What lands on top depends on
              what’s in season, so no two lunches are ever the same.
            </p>
            <p>
              Served alongside Chef Joey’s welcome bite, daily soup and Shiza
              Sarada, Roru’s take on a Caesar salad, it’s everything you need for
              a quick bite without the fuss.
            </p>
            <p>
              Come hungry, grab a seat at the counter and see what’s on the board
              that day.
            </p>
            <p className="roru-menu-story__detail">
              Daily Bara Chirashi Lunch Set, weekdays from 12–2:30pm.
            </p>
          </div>
        </div>
      </section>

      <section
        className="roru-menu-story"
        aria-labelledby="roru-menu-night-story-title"
      >
        <div
          className="roru-menu-story__gallery roru-menu-story__gallery--night"
          aria-hidden="true"
        >
          <StoryImage
            src="/MENU PAGE ITEMS/EDN08182.jpg"
            className="roru-menu-story__image--large"
            sizes="(max-width: 767px) 68vw, 30vw"
          />
          <StoryImage
            src="/MENU PAGE ITEMS/EDN08168-Edit.jpg"
            className="roru-menu-story__image--small-bottom"
            sizes="(max-width: 767px) 42vw, 18vw"
          />
        </div>
        <div className="roru-menu-story__content">
          <h2 id="roru-menu-night-story-title" className="roru-menu-story__title">
            When the sun goes down
          </h2>
          <div className="roru-menu-story__copy">
            <p>
              As the sun sets, the pace shifts, the lights come down and the music
              turns up a notch. The counter comes alive, with drinks and hand
              rolls flowing throughout the night.
            </p>
            <p>
              Made to order, our rolls bring together warm seasoned rice, crisp
              nori flown in from Japan and seafood dressed with care. Some stay
              close to the classics. Others wander a little further.
            </p>
            <p>
              Mala Negitoro, Coconut Shrimp, Typhoon Shelter Soft Shell Crab and
              Lobster Bomb draw on the flavours and places that have shaped the
              way Chef Joey cooks, sitting alongside the classics: salmon,
              scallop, yellowtail and unagi. The foundations are Japanese, but
              what happens from there is distinctly Roru.
            </p>
            <p>
              Start with a set, order your favourites and stay for another round.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
