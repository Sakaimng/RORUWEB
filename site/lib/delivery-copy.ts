import type { Lang } from "@/lib/i18n";

export type DeliveryCopy = {
  eyebrow: string;
  description: string;
};

/** Live delivery storefronts. `{foodpanda}` / `{keeta}` in a description render as these links. */
export const DELIVERY_PLATFORMS = {
  foodpanda: {
    label: "foodpanda",
    url: "https://www.foodpanda.hk/restaurant/otpm/rorubaru-otpm",
  },
  keeta: {
    label: "Keeta",
    url: "https://url.mykeeta.com/eOUXBrnz",
  },
} as const;

export type DeliveryPlatformKey = keyof typeof DELIVERY_PLATFORMS;

export const DELIVERY_COPY: Record<Lang, DeliveryCopy> = {
  en: {
    eyebrow: "Delivery / foodpanda & Keeta",
    description:
      "Order RORUBARU for delivery on {foodpanda} and {keeta}.",
  },
  jp: {
    eyebrow: "デリバリー / foodpanda・Keeta",
    description:
      "RORUBARU の手巻きは {foodpanda} と {keeta} でデリバリー注文いただけます。",
  },
  cn: {
    eyebrow: "外賣 / foodpanda 及 Keeta",
    description:
      "喺 {foodpanda} 或 {keeta} 就可以叫 RORUBARU 外賣。",
  },
};
