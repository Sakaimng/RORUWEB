/**
 * Structured menu data for /menu (en, ja, zh-Hant): the server-rendered text mirror
 * and the Menu JSON-LD. The visual boards on /menu are designer SVGs (no machine-
 * readable text); this mirror exposes the same items and prices to screen readers,
 * search engines and AI answer engines.
 *
 * SOURCE: public/menu.json, the same file the 3D homepage's in-room menu loads, read
 * at build time so the two can't drift. Its rules are applied here as on the homepage:
 *   - prices show only when show_prices is true AND every item/variant is priced
 *     (all or nothing; items marked `included` are exempt),
 *   - private_only items are left off,
 *   - happy hour comes from menu.json's happy_hour block.
 *
 * PRICE RULE (Dominic, 27 Oct 2026): a price may only change when it is written on his
 * Google sheet 'Roru - menu pricing comparison - October 2026' (column 'Dom suggested
 * price HK$'). Items NOT on that sheet keep the price /menu showed before this change,
 * so lib/menu-oct-rule.json holds those exceptions (shared with the homepage schema). Prices in HKD, before 10% service.
 */

import rawMenu from "@/public/menu.json";
import octRule from "@/lib/menu-oct-rule.json";

export type MenuItem = {
  name: string;
  /** Traditional-Chinese name as printed on the board, when present. */
  nameZh?: string;
  /** Price in HKD. Omit for items with a non-numeric / per-set price. */
  price?: number;
  /** Optional bottle/glass or other price variants. */
  variants?: { label: string; price: number }[];
  description?: string;
};

export type MenuSection = {
  name: string;
  note?: string;
  items: MenuItem[];
};

export type MenuBoard = {
  /** Stable id + display name. */
  id: string;
  name: string;
  note?: string;
  sections: MenuSection[];
};

export const PRICE_CURRENCY = "HKD";

/** Shown with every board: prices exclude the 10% service charge. */
export const SERVICE_NOTE = "Prices in HKD, before the 10% service charge.";

type RawItem = {
  name: string;
  nameZh?: string | null;
  price?: number | null;
  variants?: { label: string; price?: number | null }[] | null;
  description?: string | null;
  included?: boolean;
  private_only?: boolean;
  source?: string;
};
type RawSection = { name: string; note?: string | null; items: RawItem[] };
type RawBoard = { id: string; name: string; note?: string | null; sections: RawSection[] };
type RawMenu = {
  show_prices?: boolean;
  boards: RawBoard[];
  happy_hour?: { days?: string; hours?: string; note?: string; items: RawItem[] } | null;
};

const MENU = rawMenu as unknown as RawMenu;

/** Sections / prices not on the October sheet: see lib/menu-oct-rule.json. */
const NOT_ON_OCT_SHEET_SECTIONS = new Set<string>(octRule.notOnOctSheetSections);
const KEEP_EXISTING_MENU_PRICE: Record<string, number> = octRule.keepExistingMenuPrice;

function isPriced(it: RawItem): boolean {
  if (it.included) return true;
  if (it.variants && it.variants.length) {
    return it.variants.every((v) => typeof v.price === "number");
  }
  return typeof it.price === "number";
}

/** All or nothing, exactly like the homepage (public/ui.js allPriced). */
export const SHOW_PRICES: boolean =
  MENU.show_prices === true &&
  MENU.boards.every((b) => b.sections.every((s) => s.items.every(isPriced)));

function toItem(sectionName: string, it: RawItem): MenuItem {
  const item: MenuItem = { name: it.name };
  if (it.nameZh) item.nameZh = it.nameZh;
  if (it.description) item.description = it.description;
  if (it.included) item.description = item.description ?? "Included in the lunch set.";
  if (!SHOW_PRICES) return item;
  const kept = KEEP_EXISTING_MENU_PRICE[`${sectionName}|${it.name}`];
  if (it.variants && it.variants.length) {
    item.variants = it.variants.map((v) => ({ label: v.label, price: v.price as number }));
  } else if (typeof kept === "number") {
    item.price = kept;
  } else if (typeof it.price === "number") {
    item.price = it.price;
  }
  return item;
}

function toSections(board: RawBoard | undefined): MenuSection[] {
  if (!board) return [];
  return board.sections
    .filter((s) => !NOT_ON_OCT_SHEET_SECTIONS.has(s.name))
    .map((s) => ({
      name: s.name,
      ...(s.note ? { note: s.note } : {}),
      items: s.items.filter((it) => !it.private_only).map((it) => toItem(s.name, it)),
    }))
    .filter((s) => s.items.length > 0);
}

const boardById = (id: string) => MENU.boards.find((b) => b.id === id);

export const A_LA_CARTE: MenuBoard = {
  id: "a-la-carte",
  name: "À la carte",
  note: SERVICE_NOTE,
  // the lunch board's sections ride with à la carte, as before
  sections: [...toSections(boardById("a-la-carte")), ...toSections(boardById("lunch"))],
};

export const DRINKS: MenuBoard = {
  id: "drinks",
  name: "Drinks",
  note: SERVICE_NOTE,
  sections: toSections(boardById("drinks")),
};

const HH = MENU.happy_hour;
const hhItems = (HH?.items ?? []).filter((it) => !it.private_only);
const hhWhen = [HH?.days, HH?.hours].filter(Boolean).join(", ").replace(/\s*–\s*/g, "–");

/** Happy hour prices (not orderable online; shown in the text menu + schema only). */
export const HAPPY_HOUR: MenuBoard | null =
  SHOW_PRICES && hhItems.length && hhItems.every((it) => typeof it.price === "number")
    ? {
        id: "happy-hour",
        name: "Happy Hour",
        note: `Selected drinks${hhWhen ? `, ${hhWhen}` : ""}. ${SERVICE_NOTE}`,
        sections: [
          {
            name: `Happy Hour${hhWhen ? ` (${hhWhen})` : ""}`,
            items: hhItems.map((it) => ({ name: it.name, price: it.price as number })),
          },
        ],
      }
    : null;

/** Orderable boards (the order catalog reads these). */
export const MENU_BOARDS: MenuBoard[] = [A_LA_CARTE, DRINKS];

/** Everything published on /menu and in the Menu JSON-LD. */
export const PUBLISHED_MENU_BOARDS: MenuBoard[] = HAPPY_HOUR
  ? [A_LA_CARTE, DRINKS, HAPPY_HOUR]
  : [A_LA_CARTE, DRINKS];
