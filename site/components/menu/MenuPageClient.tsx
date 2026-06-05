"use client";

import { MenuSvgBoard } from "@/components/menu/MenuSvgBoard";

const ALA_CARTE_MOBILE = [
  "/menus/A la carte 1.svg",
  "/menus/A la carte 2.svg",
] as const;

const DRINKS_MOBILE = [
  "/menus/DRINKS MENU 1.svg",
  "/menus/DRINKS MENU 2.svg",
] as const;

export function MenuPageClient() {
  return (
    <div className="roru-menu-page">
      <header className="roru-menu-page__header">
        <h1 className="roru-menu-page__title">Menus</h1>
      </header>

      <div className="roru-menu-page__boards">
        <MenuSvgBoard
          src="/menus/a-la-carte.svg"
          mobileSrc={ALA_CARTE_MOBILE}
          title="À la carte"
          headingId="roru-menu-ala-carte"
        />
        <MenuSvgBoard
          src="/menus/drinks.svg"
          mobileSrc={DRINKS_MOBILE}
          title="Drinks"
          headingId="roru-menu-drinks"
        />
      </div>
    </div>
  );
}
