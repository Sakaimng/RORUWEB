/**
 * Structured menu data — the single source of truth for the crawlable text menu
 * and the Menu JSON-LD. The visual menu on /menu is rendered from outlined-vector
 * SVGs (no machine-readable text), so this mirror exposes the same items, prices
 * and descriptions to screen readers, search engines and AI answer engines.
 *
 * Prices are in HKD. Transcribed from the published à la carte + drinks boards —
 * PLEASE VERIFY prices, Chinese names and the service-charge notes before relying
 * on this in production; correcting a value here updates both the page and schema.
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

export const A_LA_CARTE: MenuBoard = {
  id: "a-la-carte",
  name: "À la carte",
  note: "No service charge.",
  sections: [
    {
      name: "Hand Roll Sets",
      note: "Sets of hand rolls (temaki), served fresh off the bar.",
      items: [
        { name: "4 Roll Set", price: 218, description: "Yellowtail, Salmon, Mala Negitoro, Tamago (V)" },
        { name: "5 Roll Set", price: 288, description: "Scallop, Yellowtail, Salmon, Mala Negitoro, Tamago (V)" },
        { name: "6 Roll Set", price: 358, description: "Scallop, Yellowtail, Salmon, Mala Negitoro, Lobster Bomb, Tamago (V)" },
        { name: "7 Roll Set", price: 428, description: "Scallop, Yellowtail, Salmon, Mala Negitoro, Lobster Bomb, Unagi, Tamago (V)" },
        { name: "Chef's Pick", price: 588, description: "Appetisers, 7 rolls, and dessert." },
      ],
    },
    {
      name: "Classic Rolls",
      items: [
        { name: "Akami Tuna", nameZh: "赤身", price: 68 },
        { name: "Ikura", nameZh: "三文魚籽", price: 68 },
        { name: "Medai", nameZh: "鯛魚", price: 68 },
        { name: "Salmon", nameZh: "三文魚", price: 58 },
        { name: "Scallop", nameZh: "帆立貝", price: 78 },
        { name: "Unagi", nameZh: "鰻魚", price: 68 },
        { name: "Yellowtail", nameZh: "油甘魚", price: 58 },
      ],
    },
    {
      name: "Signature Rolls",
      items: [
        { name: "Aka Ebi", nameZh: "紅蝦", price: 78 },
        { name: "Coconut Shrimp", nameZh: "椰子蝦", price: 68 },
        { name: "Lobster Bomb", nameZh: "龍蝦炸彈", price: 88 },
        { name: "Mala Negitoro", nameZh: "麻辣赤葱魚蓉", price: 88 },
        { name: "Typhoon Shelter Soft Shell Crab", nameZh: "避風塘軟殼蟹", price: 88 },
        { name: "Wagyu", nameZh: "和牛", price: 108 },
      ],
    },
    {
      name: "Vegetarian Rolls",
      items: [
        { name: "Maitake Tempura", nameZh: "舞茸", price: 58 },
        { name: "Tamago (V)", nameZh: "玉子燒", price: 58 },
      ],
    },
    {
      name: "Appetisers",
      items: [
        { name: "Daily Miso Soup", nameZh: "味噌湯", price: 48 },
        { name: "Edamame", nameZh: "枝豆", price: 48 },
        { name: "Kisu Tempura", nameZh: "天婦羅鱚魚", price: 88 },
        { name: "Negitoro Dip", price: 88 },
        { name: "Potato Salad", nameZh: "薯仔沙律", price: 58 },
        { name: "Shiza Sarada", nameZh: "凱撒沙律", price: 68, description: "Roru's Caesar Salad" },
      ],
    },
    {
      name: "Desserts",
      items: [
        { name: "Monaka", nameZh: "最中", price: 68 },
        { name: "Warabi Mochi", nameZh: "蕨餅", price: 68 },
      ],
    },
    {
      name: "Daily Bara Chirashi",
      note: "From 12–2:30. Quality cuts changed daily. Premium add-ons optional.",
      items: [
        { name: "Daily Bara Chirashi", price: 178 },
        { name: "Add Uni", nameZh: "海膽", price: 88 },
        { name: "Add Caviar", nameZh: "魚子醬", price: 88 },
        { name: "Add Ikura", nameZh: "三文魚子", price: 68 },
      ],
    },
  ],
};

export const DRINKS: MenuBoard = {
  id: "drinks",
  name: "Drinks",
  note: "All prices subject to 10% service charge.",
  sections: [
    {
      name: "On Tap",
      items: [
        { name: "Draught Beer", price: 98 },
        { name: "Draught Sake (carafe)", price: 198 },
        { name: "Oolong Highball", price: 98 },
        { name: "Kaku Highball", price: 98 },
        { name: "Spicy Paloma", price: 98 },
        { name: "Yuzu Holzer OG", price: 98 },
      ],
    },
    {
      name: "Sake",
      items: [
        { name: "Sake Cup", price: 98, description: "Clean, mellow, smooth." },
        { name: "Sari Black", price: 588, description: "Dry, umami, bold." },
        { name: "Wakabotan Hinohikari", price: 588, description: "Elegant, melon, fruity." },
        { name: "Magnum Sari Black", price: 988, description: "Dry, umami, bold." },
      ],
    },
    {
      name: "Wine — White",
      note: "Curated by Vines & Terroirs.",
      items: [
        { name: "Pessegueiro Colheita Branco (2023)", variants: [{ label: "Glass", price: 108 }, { label: "Bottle", price: 338 }], description: "Dry with a crisp citrus freshness." },
        { name: "Les Hauts d'Artigny Touraine Amboise (2023)", variants: [{ label: "Bottle", price: 338 }], description: "Full-bodied and sophisticated with a hint of citrus." },
        { name: "La Moynerie (2023)", variants: [{ label: "Bottle", price: 338 }], description: "Vivid and sharp with a zesty finish." },
        { name: "La Croix Picot (2022)", variants: [{ label: "Bottle", price: 668 }], description: "Rich and complex with a hint of caramel." },
        { name: "Foreau Vouvray Sec (2021)", variants: [{ label: "Bottle", price: 818 }], description: "Crisp and textured with subtle notes of honey and citrus." },
        { name: "Saint-Véran La Renommée (2022)", variants: [{ label: "Bottle", price: 888 }], description: "Smooth and elegant with soft citrus and creamy notes." },
      ],
    },
    {
      name: "Wine — Red",
      note: "Curated by Vines & Terroirs.",
      items: [
        { name: "Pessegueiro Aluze Douro DOC (2020)", variants: [{ label: "Glass", price: 108 }, { label: "Bottle", price: 338 }], description: "Crisp and fruity with dark berry and spice notes." },
        { name: "Clos de la Gaffelière (2016)", variants: [{ label: "Bottle", price: 898 }], description: "Rich and oaky with dark fruit notes." },
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
      items: [{ name: "Soli Highball", price: 98 }],
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
    {
      name: "Daily Happy Hour (12pm–7pm)",
      items: [
        { name: "Draught Beer", price: 44 },
        { name: "Oolong Highball", price: 49 },
        { name: "Kaku Highball", price: 49 },
        { name: "Spicy Paloma", price: 49 },
        { name: "Yuzu Holzer OG", price: 49 },
        { name: "Pessegueiro Colheita Branco — White (glass)", price: 59 },
        { name: "Pessegueiro Aluze Douro DOC — Red (glass)", price: 59 },
      ],
    },
  ],
};

export const MENU_BOARDS: MenuBoard[] = [A_LA_CARTE, DRINKS];
