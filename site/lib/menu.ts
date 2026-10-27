/**
 * Structured menu data — the single source of truth for the crawlable text menu
 * and the Menu JSON-LD. The visual menu on /menu is rendered from outlined-vector
 * SVGs (no machine-readable text), so this mirror exposes the same items, prices
 * and descriptions to screen readers, search engines and AI answer engines.
 *
 * Prices are in HKD, before the 10% service charge. Synced on 2026-10-27 with
 * public/menu.json (the menu the 3D homepage shows), which is built from Dominic's
 * October 2026 pricing sheet ('Dom suggested price', confirmed Oct 11 2026).
 * Private-only items are left off. Keep this file and public/menu.json in step;
 * correcting a value here updates both the /menu text mirror and its schema.
 */

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

export const A_LA_CARTE: MenuBoard = {
  id: "a-la-carte",
  name: "À la carte",
  note: SERVICE_NOTE,
  sections: [
    {
      name: "Hand Roll Sets",
      note: "Sets of hand rolls (temaki), served fresh off the bar.",
      items: [
        { name: "4 Roll Set", price: 218, description: "Yellowtail, Salmon, Mala Negitoro, Tamago (V)" },
        { name: "5 Roll Set", price: 298, description: "Scallop, Yellowtail, Salmon, Mala Negitoro, Tamago (V)" },
        { name: "6 Roll Set", price: 368, description: "Scallop, Yellowtail, Salmon, Mala Negitoro, Lobster Bomb, Tamago (V)" },
        { name: "7 Roll Set", price: 438, description: "Scallop, Yellowtail, Salmon, Mala Negitoro, Lobster Bomb, Unagi, Tamago (V)" },
        { name: "Chef's Pick", price: 608, description: "Appetisers, 7 rolls, and dessert." },
      ],
    },
    {
      name: "Classic Rolls",
      items: [
        { name: "Medai", nameZh: "鯛魚", price: 68 },
        { name: "Salmon", nameZh: "三文魚", price: 68 },
        { name: "Yellowtail", nameZh: "油甘魚", price: 68 },
        { name: "Akami Tuna", nameZh: "赤身", price: 78 },
        { name: "Ikura", nameZh: "三文魚子", price: 78 },
        { name: "Unagi", nameZh: "鰻魚", price: 78 },
        { name: "Scallop", nameZh: "帆立貝", price: 88 },
      ],
    },
    {
      name: "Signature Rolls",
      items: [
        { name: "Mala Negitoro", nameZh: "麻辣香拿魚蓉", price: 68 },
        { name: "Aka Ebi", nameZh: "紅蝦", price: 78 },
        { name: "Lobster Bomb", nameZh: "龍蝦炸彈", price: 78 },
        { name: "Coconut Shrimp", nameZh: "椰子蝦", price: 88 },
        { name: "Typhoon Shelter Soft Shell Crab", nameZh: "避風塘軟殼蟹", price: 88 },
        { name: "Wagyu", nameZh: "和牛", price: 108 },
      ],
    },
    {
      name: "Vegetarian Rolls",
      items: [
        { name: "Tamago (V)", nameZh: "玉子燒", price: 38 },
        { name: "Maitake Tempura", nameZh: "舞茸", price: 68 },
      ],
    },
    {
      name: "Appetisers",
      items: [
        { name: "Daily Miso Soup", nameZh: "味噌湯", price: 38 },
        { name: "Edamame", nameZh: "枝豆", price: 48 },
        { name: "Kisu Tempura", nameZh: "天婦羅鱚魚", price: 68 },
        { name: "Spicy Chanja Cream Cheese", nameZh: "辣鱈魚腸忌廉芝士", price: 78 },
        { name: "Potato Salad", nameZh: "薯仔沙律", price: 78 },
        { name: "Shiza Sarada", nameZh: "凱撒沙律", price: 78, description: "Roru's Caesar Salad" },
        { name: "Snow Crab Tamago", nameZh: "雪場蟹玉子", price: 88 },
        { name: "Daily Crudo", price: 88 },
        { name: "Negitoro Dip", nameZh: "葱花吞拿魚蓉", price: 98 },
        { name: "Grilled Kama", price: 148 },
      ],
    },
    {
      name: "Caviar",
      items: [
        { name: "Ossetra Caviar (50g)", nameZh: "Ossetra 魚子醬 (50克)", price: 488 },
      ],
    },
    {
      name: "Desserts",
      items: [
        { name: "Monaka", nameZh: "最中", price: 68 },
        { name: "Mapo Tofu Ice Cream", nameZh: "麻婆豆腐雪糕", price: 68 },
      ],
    },
    {
      name: "Lunch Handroll Set",
      note: "Weekdays 12–2:30pm. Comes with Chef Joey's welcome bite, daily soup and Shiza Sarada (Roru's Caesar Salad).",
      items: [
        { name: "4 Rolls", price: 178 },
        { name: "5 Rolls", price: 228 },
      ],
    },
    {
      name: "Pick your rolls",
      items: [
        { name: "Salmon", nameZh: "三文魚", description: "Included in the lunch set." },
        { name: "Akami", nameZh: "赤身", description: "Included in the lunch set." },
        { name: "Tamago", nameZh: "玉子燒", description: "Included in the lunch set." },
        { name: "Ikura", nameZh: "三文魚子", description: "Included in the lunch set." },
        { name: "Unagi", nameZh: "鰻魚", description: "Included in the lunch set." },
        { name: "Yellowtail", nameZh: "油甘魚", description: "Included in the lunch set." },
        { name: "Mala Negitoro", nameZh: "麻辣吞拿魚蓉", description: "Included in the lunch set." },
        { name: "Lobster Bomb", nameZh: "龍蝦炸彈", description: "Included in the lunch set." },
        { name: "Maitake Mushroom", nameZh: "舞茸", description: "Included in the lunch set." },
      ],
    },
    {
      name: "Roll Upgrades",
      note: "Add-on price per roll.",
      items: [
        { name: "Coconut Shrimp", nameZh: "椰子蝦", price: 28 },
        { name: "Typhoon Shelter Soft Shell Crab", nameZh: "避風塘軟殼蟹", price: 28 },
        { name: "Wagyu", nameZh: "和牛", price: 38 },
      ],
    },
    {
      name: "Premium Add-ons (optional)",
      items: [
        { name: "Ikura", nameZh: "三文魚子", price: 38 },
        { name: "Caviar", nameZh: "魚子醬", price: 88 },
      ],
    },
    {
      name: "Daily Bara Chirashi",
      note: "Available weekdays 12–2:30pm. Quality cuts changed daily. Premium add-ons optional. All lunchtime sets include a welcome bite, Chef Joey's soup and Shiza Sarada (Roru's Caesar Salad); +$10 for any tea.",
      items: [
        { name: "Daily Bara Chirashi", price: 178 },
        { name: "Add Ikura", nameZh: "三文魚子", price: 48 },
        { name: "Add Uni", nameZh: "海膽", price: 88 },
        { name: "Add Caviar", nameZh: "魚子醬", price: 88 },
      ],
    },
  ],
};

export const DRINKS: MenuBoard = {
  id: "drinks",
  name: "Drinks",
  note: SERVICE_NOTE,
  sections: [
    {
      name: "On Tap",
      items: [
        { name: "Draught Beer", price: 78 },
        { name: "Umeshu Highball", price: 88 },
        { name: "Kaku Highball", price: 88 },
        { name: "Spicy Paloma", price: 98 },
        { name: "Yuzu Holzer OG", price: 98 },
        { name: "Draught Sake (carafe)", price: 198 },
      ],
    },
    {
      name: "Sake",
      items: [
        { name: "Sake Cup", price: 98, description: "Clean, mellow, smooth." },
        { name: "Sari Black", price: 588, description: "Dry, umami, bold." },
        { name: "Taiko Junmai", price: 658, description: "Dry, soft, crisp." },
        { name: "Wakabotan Hinohikari", price: 678, description: "Elegant, melon, fruity." },
      ],
    },
    {
      name: "Wine — White",
      note: "Curated by Vines & Terroirs.",
      items: [
        { name: "Pessegueiro Colheita Branco (2023)", variants: [{ label: "Glass", price: 88 }, { label: "Bottle", price: 408 }], description: "Dry with a crisp citrus freshness." },
        { name: "Les Hauts d'Artigny Touraine Amboise (2023)", variants: [{ label: "Bottle", price: 428 }], description: "Full-bodied and sophisticated with a hint of citrus." },
        { name: "La Moynerie (2023)", variants: [{ label: "Bottle", price: 678 }], description: "Vivid and sharp with a zesty finish." },
      ],
    },
    {
      name: "Soda",
      items: [
        { name: "Yuzu Soda", price: 48 },
        { name: "Shizuoka Cola", price: 48 },
      ],
    },
    {
      name: "Tequila",
      note: "Curated by Solisca.",
      items: [
        { name: "Celosa Blush", price: 108 },
      ],
    },
    {
      name: "Tea",
      note: "Curated by Inari. Served hot or cold.",
      items: [
        { name: "Hojicha", price: 48, description: "Roasted Japanese green tea with caramelized warmth and very low caffeine. Comforting and grounding." },
        { name: "Genmaicha Midori", price: 48, description: "Green tea blended with roasted rice. Nutty, warm and deeply satisfying." },
        { name: "Ruby Symphony", price: 48, description: "Hibiscus, rose and wild berries. Vibrant, fruity and slightly tart." },
      ],
    },
    {
      name: "Water",
      note: "Free refills.",
      items: [
        { name: "Still Water (per person)", price: 18 },
        { name: "Sparkling Water (per person)", price: 18 },
      ],
    },
  ],
};

/** Happy hour prices (not orderable online; shown in the text menu + schema only). */
export const HAPPY_HOUR: MenuBoard = {
  id: "happy-hour",
  name: "Happy Hour",
  note: "Selected drinks, Mon–Fri 12pm–7pm. Prices in HKD, before the 10% service charge.",
  sections: [
    {
      name: "Happy Hour (Mon–Fri, 12pm–7pm)",
      items: [
        { name: "Draught Beer", price: 48 },
        { name: "White Wine (glass)", price: 58 },
        { name: "Oolong Highball", price: 58 },
        { name: "Umeshu Highball", price: 58 },
        { name: "Kaku Highball", price: 58 },
        { name: "Spicy Paloma", price: 68 },
        { name: "Yuzu Holzer OG", price: 68 },
      ],
    },
  ],
};

/** Orderable boards (the order catalog reads these). */
export const MENU_BOARDS: MenuBoard[] = [A_LA_CARTE, DRINKS];

/** Everything published on /menu and in the Menu JSON-LD. */
export const PUBLISHED_MENU_BOARDS: MenuBoard[] = [A_LA_CARTE, DRINKS, HAPPY_HOUR];
